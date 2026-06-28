// backend/src/services/hotels.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Hotel Discovery Service — high-level business logic layer.
//
// Orchestrates:
//   1. Redis cache lookup (namespace: hotels:city / :nearby / :detail)
//   2. Foursquare Places hotel category fetch (via foursquare.hotel.provider.js)
//   3. Distance enrichment from user coordinates
//   4. Composite scoring and sort
//   5. Fire-and-forget MongoDB upsert (keyed on fsqId)
//
// Public API:
//   searchByCity(city, opts)         → { hotels[], geo, total, cached }
//   searchNearby(lat, lon, opts)     → { hotels[], total, cached }
//   getHotelDetail(fsqId, opts)      → NormalisedHotel | null
//   getProviderHealth()              → health status object
//   isProviderEnabled()              → boolean
//
// Caching strategy:
//   Namespace         TTL     Key discriminator
//   ─────────────────────────────────────────────────────────────────
//   hotels:city       30 min  city + radius + limit
//   hotels:nearby     15 min  lat,lon + radius + limit
//   hotels:detail     2 h     fsqId
//
// MongoDB persistence (fire-and-forget):
//   - Upsert by `fsqId` (unique FSQ place ID)
//   - `lastFetchedAt` tracks staleness (6h threshold for detail re-fetch)
//   - DB errors are swallowed — never block API response
// ─────────────────────────────────────────────────────────────────────────────
const https  = require('https')
const { URL } = require('url')

const hotelProvider = require('./travel/providers/foursquare.hotel.provider')
const osmHotelProvider = require('./travel/providers/overpass.hotel.provider')
const cacheService  = require('./cache.service')
const logger        = require('../utils/logger')

// ── TTL Constants ─────────────────────────────────────────────────────────────
const TTL = {
  city:   1800, // 30 min
  nearby: 900,  // 15 min
  detail: 7200, // 2 h
}

// ── Scoring & Sorting ─────────────────────────────────────────────────────────

/**
 * Composite score for ranking hotels.
 * @param {NormalisedHotel} h
 * @returns {number}
 */
function hotelScore(h) {
  let score = 0

  // Rating (0–10) → 0–60 pts
  if (h.rating != null) score += h.rating * 6

  // Popularity (0–100) → 0–25 pts
  if (h.popularityScore != null) score += h.popularityScore * 0.25

  // Bonuses
  if (h.image)        score += 5
  if (h.photos?.length > 2) score += 3
  if (h.verified)     score += 4
  if (h.website)      score += 2
  if (h.phone)        score += 1

  return score
}

function sortHotels(hotels) {
  return [...hotels].sort((a, b) => hotelScore(b) - hotelScore(a))
}

// ── Distance enrichment ───────────────────────────────────────────────────────

function haversineM(from, to) {
  if (!from?.lat || !from?.lon || !to?.lat || !to?.lon) return null
  const R  = 6371000
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat   * Math.PI) / 180
  const Δφ = ((to.lat  - from.lat) * Math.PI) / 180
  const Δλ = ((to.lon  - from.lon) * Math.PI) / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function enrichWithDistance(hotels, userCoords) {
  if (!userCoords?.lat || !userCoords?.lon) return hotels
  return hotels.map(h => {
    if (h.distanceM != null) return h
    const d = haversineM(userCoords, h.coordinates)
    const distanceM = d != null ? Math.round(d) : null
    const distanceLabel = distanceM != null
      ? (distanceM < 1000 ? `${distanceM}m` : `${(distanceM / 1000).toFixed(1)}km`)
      : null
    return { ...h, distanceM, distanceLabel }
  })
}

// ── Nominatim Geocoder (shared utility) ───────────────────────────────────────

async function geocodeCity(city) {
  const cacheRaw = `nominatim:hotel:${city.trim().toLowerCase()}`
  const cached   = await cacheService.getByNs('travel:geocode', cacheRaw)
  if (cached) return cached

  return new Promise((resolve) => {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', city.trim())
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('addressdetails', '0')

    const options = {
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'User-Agent': 'TripSetGo/1.0 (travel-planning-app)',
        'Accept': 'application/json',
      },
      timeout: 5000,
    }

    const req = https.request(options, res => {
      let body = ''
      res.on('data', c => { body += c })
      res.on('end', () => {
        try {
          const results = JSON.parse(body)
          if (!results?.length) return resolve(null)
          const r = results[0]
          const geo = {
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            name: r.display_name?.split(',')[0] || city,
          }
          cacheService.set('travel:geocode', cacheRaw, geo, 86400).catch(() => {})
          resolve(geo)
        } catch {
          resolve(null)
        }
      })
    })
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.on('error', () => resolve(null))
    req.end()
  })
}

// ── MongoDB Persistence ───────────────────────────────────────────────────────

async function persistHotels(hotels, city) {
  // Lazy-load Hotel model to avoid circular imports at startup
  let Hotel
  try {
    Hotel = require('../models/Hotel.model')
  } catch {
    return // Model doesn't exist yet — skip silently
  }

  const withId = hotels.filter(h => h.fsqId)
  if (!withId.length) return

  const ops = withId.map(h => ({
    updateOne: {
      filter: { fsqId: h.fsqId },
      update: {
        $set: {
          name:            h.name,
          source:          'Foursquare',
          location: {
            type:        'Point',
            coordinates: [h.coordinates?.lon, h.coordinates?.lat],
          },
          address:         h.address || undefined,
          city:            city || h.city || 'Unknown',
          averageRating:   h.rating ?? 0,
          reviewCount:     h.totalRatings || 0,
          popularityScore: h.popularityScore ?? undefined,
          priceLevel:      h.priceLevel || undefined,
          priceInfo:       h.priceInfo || undefined,
          images:          h.photos?.length ? h.photos : (h.image ? [h.image] : []),
          openingHours:    h.openingHours || undefined,
          isOpenNow:       h.isOpenNow ?? undefined,
          phone:           h.phone || undefined,
          website:         h.website || undefined,
          categories:      h.categories || [],
          verified:        h.verified || false,
          lastFetchedAt:   new Date(),
        },
      },
      upsert: true,
    },
  }))

  try {
    const result = await Hotel.bulkWrite(ops, { ordered: false })
    logger.info(`[HotelsService] Persisted ${result.upsertedCount} new + ${result.modifiedCount} updated hotels`)
  } catch (err) {
    logger.warn(`[HotelsService] DB persist failed (non-fatal): ${err.message}`)
  }
}

function persistAsync(hotels, city) {
  setImmediate(() => {
    persistHotels(hotels, city).catch(err =>
      logger.warn(`[HotelsService] persistAsync error: ${err.message}`)
    )
  })
}

// ── searchByCity ──────────────────────────────────────────────────────────────

/**
 * Search hotels by city name.
 *
 * Flow:
 *   1. Geocode city → lat/lon (Nominatim, cached 24h)
 *   2. Check Redis cache
 *   3. On MISS: FSQ hotel search with city coordinates
 *   4. Enrich with distances
 *   5. Sort by composite score
 *   6. Cache + persist (fire-and-forget)
 *
 * @param {string} city
 * @param {Object} [opts]
 * @param {number} [opts.limit=20]
 * @param {number} [opts.radius=5000]   — meters
 * @returns {Promise<{ hotels: NormalisedHotel[], geo: Object|null, total: number, cached: boolean }>}
 */
async function searchByCity(city, opts = {}) {
  const { limit = 20, radius = 5000 } = opts

  const cacheRaw = [
    `city:${city.trim().toLowerCase()}`,
    `r=${radius}`,
    `l=${limit}`,
  ].join('|')

  // ── Cache lookup ───────────────────────────────────────────────────────────
  const cached = await cacheService.getByNs('hotels:city', cacheRaw)
  if (cached) {
    logger.info(`[HotelsService] CACHE HIT city="${city}"`)
    return { ...cached, cached: true }
  }

  logger.info(`[HotelsService] CACHE MISS city="${city}" — fetching from FSQ`)

  // ── Geocode ────────────────────────────────────────────────────────────────
  const geo = await geocodeCity(city)
  if (!geo) {
    logger.warn(`[HotelsService] Cannot geocode city "${city}"`)
    return { hotels: [], geo: null, total: 0, cached: false }
  }

  // ── FSQ Fetch ──────────────────────────────────────────────────────────────
  let raw = []
  try {
    raw = await hotelProvider.searchByCity({
      lat: geo.lat,
      lon: geo.lon,
      city,
      radiusM: radius,
      limit,
    })
  } catch (err) {
    logger.warn(`[HotelsService] Foursquare searchByCity failed, falling back to Overpass: ${err.message}`)
  }

  if (!raw || raw.length === 0) {
    logger.info(`[HotelsService] Using keyless Overpass fallback for city="${city}"`)
    try {
      raw = await osmHotelProvider.searchByCity({
        lat: geo.lat,
        lon: geo.lon,
        radiusM: radius,
        limit,
      })
    } catch (osmErr) {
      logger.error(`[HotelsService] Overpass fallback failed: ${osmErr.message}`)
    }
  }

  const userCoords = { lat: geo.lat, lon: geo.lon }
  const enriched   = enrichWithDistance(raw, userCoords)
  const hotels     = sortHotels(enriched)

  const result = { hotels, geo, total: hotels.length, cached: false }

  // ── Cache store ────────────────────────────────────────────────────────────
  cacheService.set('hotels:city', cacheRaw, result, TTL.city).catch(err =>
    logger.warn(`[HotelsService] Cache SET failed (city): ${err.message}`)
  )

  // ── DB Persist ─────────────────────────────────────────────────────────────
  persistAsync(hotels, city)

  return result
}

// ── searchNearby ──────────────────────────────────────────────────────────────

/**
 * Search hotels near given coordinates.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Object} [opts]
 * @param {number} [opts.radius=2000]
 * @param {number} [opts.limit=20]
 * @returns {Promise<{ hotels: NormalisedHotel[], total: number, cached: boolean }>}
 */
async function searchNearby(lat, lon, opts = {}) {
  const { radius = 2000, limit = 20 } = opts

  const rLat = parseFloat(lat.toFixed(4))
  const rLon = parseFloat(lon.toFixed(4))
  const cacheRaw = `nearby:${rLat},${rLon}|r=${radius}|l=${limit}`

  // ── Cache lookup ───────────────────────────────────────────────────────────
  const cached = await cacheService.getByNs('hotels:nearby', cacheRaw)
  if (cached) {
    logger.info(`[HotelsService] CACHE HIT nearby=(${rLat},${rLon})`)
    return { ...cached, cached: true }
  }

  logger.info(`[HotelsService] CACHE MISS nearby=(${rLat},${rLon}) — fetching from FSQ`)

  // ── FSQ Fetch ──────────────────────────────────────────────────────────────
  let raw = []
  try {
    raw  = await hotelProvider.searchNearby(rLat, rLon, { radiusM: radius, limit })
  } catch (err) {
    logger.warn(`[HotelsService] Foursquare searchNearby failed, falling back to Overpass: ${err.message}`)
  }

  if (!raw || raw.length === 0) {
    logger.info(`[HotelsService] Using keyless Overpass fallback for nearby=(${rLat}, ${rLon})`)
    try {
      raw = await osmHotelProvider.searchNearby(rLat, rLon, { radiusM: radius, limit })
    } catch (osmErr) {
      logger.error(`[HotelsService] Overpass fallback failed: ${osmErr.message}`)
    }
  }
  const userCoords = { lat: rLat, lon: rLon }
  const hotels = sortHotels(enrichWithDistance(raw, userCoords))

  const result = { hotels, total: hotels.length, cached: false }

  cacheService.set('hotels:nearby', cacheRaw, result, TTL.nearby).catch(err =>
    logger.warn(`[HotelsService] Cache SET failed (nearby): ${err.message}`)
  )

  persistAsync(hotels)
  return result
}

// ── getHotelDetail ────────────────────────────────────────────────────────────

/**
 * Get full hotel details by Foursquare ID.
 * Fetches from FSQ, caches for 2h.
 *
 * @param {string} fsqId
 * @param {Object} [opts]
 * @param {boolean} [opts.forceRefresh=false]
 * @returns {Promise<NormalisedHotel | null>}
 */
async function getHotelDetail(fsqId, opts = {}) {
  const { forceRefresh = false } = opts
  if (!fsqId?.trim()) return null

  const cacheRaw = `detail:${fsqId}`

  if (!forceRefresh) {
    const cached = await cacheService.getByNs('hotels:detail', cacheRaw)
    if (cached) {
      logger.info(`[HotelsService] CACHE HIT detail fsqId="${fsqId}"`)
      return { ...cached, cached: true }
    }
  }

  let detail = null
  if (fsqId.startsWith('osm-')) {
    detail = await osmHotelProvider.getHotelDetail(fsqId)
  } else {
    try {
      detail = await hotelProvider.getHotelDetail(fsqId)
    } catch (err) {
      logger.warn(`[HotelsService] getHotelDetail failed, falling back to Overpass: ${err.message}`)
      detail = await osmHotelProvider.getHotelDetail(fsqId)
    }
  }
  if (!detail) return null

  const result = { ...detail, cached: false }

  cacheService.set('hotels:detail', cacheRaw, result, TTL.detail).catch(err =>
    logger.warn(`[HotelsService] Cache SET failed (detail): ${err.message}`)
  )

  persistAsync([detail])
  return result
}

// ── Health ────────────────────────────────────────────────────────────────────

async function getProviderHealth() {
  return hotelProvider.healthStatus()
}

function isProviderEnabled() {
  return true // Overpass keyless fallback is always enabled
}

module.exports = {
  searchByCity,
  searchNearby,
  getHotelDetail,
  getProviderHealth,
  isProviderEnabled,
}
