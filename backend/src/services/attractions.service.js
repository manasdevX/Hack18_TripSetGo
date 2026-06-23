// backend/src/services/attractions.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Attractions Discovery Service — high-level business logic layer.
//
// This service orchestrates:
//   1. Cache lookup (Redis via cache.service.js)
//   2. OpenTripMap API fetch (via opentripmap.provider.js)
//   3. MongoDB persistence (fire-and-forget upsert via Attraction model)
//   4. Response shaping and sorting
//
// Public API:
//   searchByCity(city, options)          → { attractions[], geo, total, cached }
//   searchNearby(lat, lon, options)      → { attractions[], total, cached }
//   getAttractionDetail(xid, options)    → NormalisedAttraction | null
//   invalidateCity(city)                 → void (cache bust)
//   getProviderHealth()                  → health status object
//
// Caching strategy:
//   Namespace                TTL     Key discriminator
//   ─────────────────────────────────────────────────────────────
//   attractions:city          900s    city + limit + kinds + radius
//   attractions:nearby        600s    lat,lon,radius,limit,kinds
//   attractions:detail        1800s   xid
//
// MongoDB persistence strategy (fire-and-forget):
//   - Upsert by `xid` (unique OTM identifier)
//   - Only persists attractions with a valid xid
//   - `lastFetchedAt` tracks data freshness
//   - DB errors are logged and swallowed — never block the API response
// ─────────────────────────────────────────────────────────────────────────────
const otmProvider   = require('./travel/providers/opentripmap.provider')
const cacheService  = require('./cache.service')
const Attraction    = require('../models/Attraction.model')
const logger        = require('../utils/logger')

// ── TTL Constants ─────────────────────────────────────────────────────────────
const TTL = {
  city:   900,   // 15 min
  nearby: 600,   // 10 min
  detail: 1800,  // 30 min
}

// ── Sorting ───────────────────────────────────────────────────────────────────

const CATEGORY_PRIORITY = {
  Heritage:      10,
  Culture:        9,
  Viewpoint:      8,
  Nature:         7,
  Sightseeing:    6,
  Spiritual:      5,
  Entertainment:  4,
  Food:           3,
}

/**
 * Sort attractions by: mustSee first → popularity score → category priority → name length.
 * @param {NormalisedAttraction[]} attractions
 * @returns {NormalisedAttraction[]}
 */
function sortAttractions(attractions) {
  return [...attractions].sort((a, b) => {
    if (a.mustSee && !b.mustSee) return -1
    if (!a.mustSee && b.mustSee)  return 1

    const scoreDiff = (b.popularityScore || 0) - (a.popularityScore || 0)
    if (scoreDiff !== 0) return scoreDiff

    const pa = CATEGORY_PRIORITY[a.category] || 0
    const pb = CATEGORY_PRIORITY[b.category] || 0
    if (pa !== pb) return pb - pa

    return (a.name?.length || 999) - (b.name?.length || 999)
  })
}

// ── MongoDB Persistence ───────────────────────────────────────────────────────

/**
 * Fire-and-forget: upsert a batch of normalised attractions into MongoDB.
 * Only persists items that have a valid xid (OTM unique ID).
 * Does NOT block the API response — errors are swallowed.
 *
 * @param {NormalisedAttraction[]} attractions
 * @param {string} [city]  — Optional city tag for the record
 */
async function persistAttractions(attractions, city) {
  const withXid = attractions.filter(a => a.xid)
  if (!withXid.length) return

  const ops = withXid.map(a => ({
    updateOne: {
      filter: { xid: a.xid },
      update: {
        $set: {
          name:             a.name,
          category:         a.category,
          description:      a.description || undefined,
          location: {
            type:        'Point',
            coordinates: [a.coordinates.lon, a.coordinates.lat],
          },
          city:             city || a.address?.split(',').pop()?.trim() || 'Unknown',
          images:           a.images?.length ? a.images : (a.image ? [a.image] : []),
          popularityScore:  a.popularityScore,
          kinds:            a.tags || [],
          website:          a.website || undefined,
          wikidata:         a.wikidata || undefined,
          wikipedia:        a.wikipedia || undefined,
          address:          a.address || undefined,
          phone:            a.phone || undefined,
          openingHours:     a.openingHours || undefined,
          source:           a.source || 'OpenTripMap',
          lastFetchedAt:    new Date(),
        },
      },
      upsert: true,
    },
  }))

  try {
    const result = await Attraction.bulkWrite(ops, { ordered: false })
    logger.info(`[AttractionsService] Persisted ${result.upsertedCount} new + ${result.modifiedCount} updated attractions`)
  } catch (err) {
    logger.warn(`[AttractionsService] DB persist failed (non-fatal): ${err.message}`)
  }
}

/**
 * Fire-and-forget wrapper — runs persistence async, never awaited by caller.
 */
function persistAsync(attractions, city) {
  setImmediate(() => {
    persistAttractions(attractions, city).catch(err =>
      logger.warn(`[AttractionsService] persistAsync error: ${err.message}`)
    )
  })
}

// ── searchByCity ─────────────────────────────────────────────────────────────

/**
 * Search attractions by city name.
 *
 * Flow:
 *   1. Check Redis cache (namespace: attractions:city)
 *   2. On MISS: OTM geocode + radius fetch
 *   3. Sort results by popularity/category
 *   4. Store in cache (fire-and-forget)
 *   5. Persist to MongoDB (fire-and-forget)
 *   6. Return { attractions, geo, total, cached }
 *
 * @param {string} city — City name e.g. "Jaipur"
 * @param {Object} [opts]
 * @param {number} [opts.limit=20]      — Max results (1–50)
 * @param {number} [opts.radius=12000]  — Search radius in meters
 * @param {string} [opts.kinds]         — Comma-separated OTM kinds
 * @returns {Promise<{ attractions: NormalisedAttraction[], geo: Object|null, total: number, cached: boolean }>}
 */
async function searchByCity(city, opts = {}) {
  const {
    limit  = 20,
    radius = 12000,
    kinds,
  } = opts

  const cacheRaw = `city:${city.trim().toLowerCase()}|r=${radius}|l=${limit}|k=${kinds || 'default'}`

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const cached = await cacheService.getByNs('attractions:city', cacheRaw)
  if (cached) {
    logger.info(`[AttractionsService] CACHE HIT city="${city}"`)
    return { ...cached, cached: true }
  }

  logger.info(`[AttractionsService] CACHE MISS city="${city}" — fetching from OTM`)

  // ── OTM Fetch ─────────────────────────────────────────────────────────────
  const { attractions: raw, geo } = await otmProvider.fetchAttractionsByCity({
    city,
    radiusM: radius,
    limit,
    kinds,
  })

  const attractions = sortAttractions(raw)
  const result = { attractions, geo, total: attractions.length, cached: false }

  // ── Cache store (fire-and-forget) ─────────────────────────────────────────
  cacheService.set('attractions:city', cacheRaw, result, TTL.city).catch(err =>
    logger.warn(`[AttractionsService] Cache SET failed (city): ${err.message}`)
  )

  // ── DB Persist (fire-and-forget) ──────────────────────────────────────────
  persistAsync(attractions, city)

  return result
}

// ── searchNearby ─────────────────────────────────────────────────────────────

/**
 * Search attractions near given coordinates.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Object} [opts]
 * @param {number} [opts.radius=5000]   — Search radius in meters (max 50000)
 * @param {number} [opts.limit=20]      — Max results (1–50)
 * @param {string} [opts.kinds]         — Comma-separated OTM kinds
 * @returns {Promise<{ attractions: NormalisedAttraction[], total: number, cached: boolean }>}
 */
async function searchNearby(lat, lon, opts = {}) {
  const {
    radius = 5000,
    limit  = 20,
    kinds,
  } = opts

  // Round to 4dp for sane cache keys (≈11m precision — good enough for "nearby")
  const rLat = parseFloat(lat.toFixed(4))
  const rLon = parseFloat(lon.toFixed(4))
  const cacheRaw = `nearby:${rLat},${rLon}|r=${radius}|l=${limit}|k=${kinds || 'default'}`

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const cached = await cacheService.getByNs('attractions:nearby', cacheRaw)
  if (cached) {
    logger.info(`[AttractionsService] CACHE HIT nearby=(${rLat},${rLon})`)
    return { ...cached, cached: true }
  }

  logger.info(`[AttractionsService] CACHE MISS nearby=(${rLat},${rLon}) — fetching from OTM`)

  // ── OTM Fetch ─────────────────────────────────────────────────────────────
  const raw = await otmProvider.fetchAttractions({
    lat:     rLat,
    lon:     rLon,
    radiusM: radius,
    limit,
    kinds,
  })

  const attractions = sortAttractions(raw)
  const result = { attractions, total: attractions.length, cached: false }

  // ── Cache store (fire-and-forget) ─────────────────────────────────────────
  cacheService.set('attractions:nearby', cacheRaw, result, TTL.nearby).catch(err =>
    logger.warn(`[AttractionsService] Cache SET failed (nearby): ${err.message}`)
  )

  // ── DB Persist (fire-and-forget) ──────────────────────────────────────────
  persistAsync(attractions)

  return result
}

// ── getAttractionDetail ───────────────────────────────────────────────────────

/**
 * Get full details for a single attraction by its OTM xid.
 * Checks DB first for a recently-cached record; fetches from OTM on miss.
 *
 * @param {string} xid — OTM unique attraction ID
 * @param {Object} [opts]
 * @param {boolean} [opts.forceRefresh=false] — Bypass cache and DB, always re-fetch
 * @returns {Promise<NormalisedAttraction | null>}
 */
async function getAttractionDetail(xid, opts = {}) {
  const { forceRefresh = false } = opts

  if (!xid?.trim()) return null

  const cacheRaw = `detail:${xid}`

  // ── Cache lookup (skip on forceRefresh) ───────────────────────────────────
  if (!forceRefresh) {
    const cached = await cacheService.getByNs('attractions:detail', cacheRaw)
    if (cached) {
      logger.info(`[AttractionsService] CACHE HIT detail xid="${xid}"`)
      return { ...cached, cached: true }
    }

    // ── DB lookup — check if we have a recent record ──────────────────────
    try {
      const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h
      const dbRecord = await Attraction.findOne({ xid }).lean()

      if (dbRecord && dbRecord.lastFetchedAt) {
        const age = Date.now() - new Date(dbRecord.lastFetchedAt).getTime()
        if (age < STALE_THRESHOLD_MS) {
          logger.info(`[AttractionsService] DB HIT detail xid="${xid}" (age ${Math.round(age / 60000)}min)`)

          // Reshape DB record to NormalisedAttraction schema
          const fromDB = {
            id:             `otm:${dbRecord.xid}`,
            xid:            dbRecord.xid,
            source:         dbRecord.source || 'OpenTripMap',
            name:           dbRecord.name,
            category:       dbRecord.category,
            rating:         dbRecord.averageRating || null,
            popularityScore: dbRecord.popularityScore || 0,
            coordinates:    {
              lat: dbRecord.location?.coordinates?.[1],
              lon: dbRecord.location?.coordinates?.[0],
            },
            images:         dbRecord.images || [],
            image:          dbRecord.images?.[0] || null,
            description:    dbRecord.description || null,
            tags:           dbRecord.kinds || [],
            address:        dbRecord.address || null,
            website:        dbRecord.website || null,
            wikidata:       dbRecord.wikidata || null,
            wikipedia:      dbRecord.wikipedia || null,
            phone:          dbRecord.phone || null,
            openingHours:   dbRecord.openingHours || null,
            mustSee:        (dbRecord.popularityScore || 0) >= 75,
            cached:         true,
          }

          // Warm the Redis cache with DB result
          cacheService.set('attractions:detail', cacheRaw, fromDB, TTL.detail).catch(() => {})
          return fromDB
        }
      }
    } catch (err) {
      logger.warn(`[AttractionsService] DB lookup failed for xid="${xid}": ${err.message}`)
    }
  }

  logger.info(`[AttractionsService] CACHE/DB MISS detail xid="${xid}" — fetching from OTM`)

  // ── OTM Fetch ─────────────────────────────────────────────────────────────
  const detail = await otmProvider.fetchAttractionDetail(xid)
  if (!detail) return null

  const result = { ...detail, cached: false }

  // ── Cache store (fire-and-forget) ─────────────────────────────────────────
  cacheService.set('attractions:detail', cacheRaw, result, TTL.detail).catch(err =>
    logger.warn(`[AttractionsService] Cache SET failed (detail): ${err.message}`)
  )

  // ── DB Persist (fire-and-forget) ──────────────────────────────────────────
  persistAsync([detail])

  return result
}

// ── invalidateCity ────────────────────────────────────────────────────────────

/**
 * Flush all Redis cache entries for a given city.
 * Useful when attraction data for a city is known to have changed.
 *
 * @param {string} city
 */
async function invalidateCity(city) {
  logger.info(`[AttractionsService] Invalidating cache for city="${city}"`)
  await cacheService.flush('attractions:city')
}

// ── getProviderHealth ─────────────────────────────────────────────────────────

/**
 * Return health status of the OTM provider.
 * @returns {Promise<Object>}
 */
async function getProviderHealth() {
  return otmProvider.healthStatus()
}

// ── isProviderEnabled ─────────────────────────────────────────────────────────

/**
 * Check if OTM provider is configured and active.
 * @returns {boolean}
 */
function isProviderEnabled() {
  return !!otmProvider.config?.enabled
}

module.exports = {
  searchByCity,
  searchNearby,
  getAttractionDetail,
  invalidateCity,
  getProviderHealth,
  isProviderEnabled,
}
