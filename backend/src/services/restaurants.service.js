// backend/src/services/restaurants.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Discovery Service — high-level business logic layer.
//
// Orchestrates:
//   1. Redis cache lookup (namespace: restaurants:city / :nearby / :detail)
//   2. Foursquare Places API fetch (via foursquare.restaurant.provider.js)
//   3. Sorting by rating / popularity / distance
//   4. Fire-and-forget MongoDB upsert (keyed on fsqId)
//   5. Distance calculation from user coordinates
//
// Public API:
//   searchByCity(city, lat, lon, options)   → { restaurants[], total, cached }
//   searchNearby(lat, lon, options)         → { restaurants[], total, cached }
//   getRestaurantDetail(fsqId, options)     → NormalisedRestaurant | null
//   getProviderHealth()                     → health status object
//   isProviderEnabled()                     → boolean
//
// Caching strategy:
//   Namespace                 TTL     Key discriminator
//   ────────────────────────────────────────────────────────────────────
//   restaurants:city          900s    city + lat + lon + radius + limit + cuisine + price
//   restaurants:nearby        600s    lat,lon + radius + limit + query + openNow
//   restaurants:detail        2700s   fsqId
//
// MongoDB persistence (fire-and-forget):
//   - Upsert by `fsqId` (unique FSQ place ID)
//   - `lastFetchedAt` tracks staleness (6h threshold)
//   - DB errors are swallowed — never block API response
// ─────────────────────────────────────────────────────────────────────────────
const fsqProvider   = require('./travel/providers/foursquare.restaurant.provider')
const osmRestaurantProvider = require('./travel/providers/overpass.restaurant.provider')
const travelApiService = require('./travel/travelApi.service')
const cacheService  = require('./cache.service')
const Restaurant    = require('../models/Restaurant.model')
const logger        = require('../utils/logger')

// ── TTL Constants ─────────────────────────────────────────────────────────────
const TTL = {
  city:   900,   // 15 min
  nearby: 600,   // 10 min
  detail: 2700,  // 45 min
}

// ── Sort Strategies ───────────────────────────────────────────────────────────

/**
 * Composite score for ranking restaurants.
 * @param {NormalisedRestaurant} r
 * @param {{ lat?: number, lon?: number }} [userCoords]
 * @returns {number}
 */
function restaurantScore(r, userCoords) {
  let score = 0

  // Rating (0–5) → 0–60 points
  if (r.rating != null) score += r.rating * 12

  // Popularity (0–100) → 0–30 points
  if (r.popularityScore != null) score += r.popularityScore * 0.3

  // Bonuses
  if (r.image)        score += 5
  if (r.openingHours?.display) score += 3
  if (r.verified)     score += 5
  if (r.description)  score += 2
  if (r.phone || r.website) score += 2

  // Distance penalty — subtract up to 10 pts for restaurants > 3km away
  if (userCoords && r.distanceM != null) {
    const km = r.distanceM / 1000
    if (km > 1) score -= Math.min(10, km * 2)
  }

  return score
}

/**
 * Sort restaurants by composite score (descending).
 * @param {NormalisedRestaurant[]} restaurants
 * @param {{ lat?: number, lon?: number }} [userCoords]
 * @returns {NormalisedRestaurant[]}
 */
function sortRestaurants(restaurants, userCoords) {
  return [...restaurants].sort(
    (a, b) => restaurantScore(b, userCoords) - restaurantScore(a, userCoords)
  )
}

// ── Distance enrichment ───────────────────────────────────────────────────────

/**
 * Haversine distance in meters between two coordinate pairs.
 */
function _haversineM(from, to) {
  if (!from || !to) return Infinity
  const R  = 6371000
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat  * Math.PI) / 180
  const Δφ = ((to.lat  - from.lat) * Math.PI) / 180
  const Δλ = ((to.lon  - from.lon) * Math.PI) / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Enrich restaurants with calculated distance from user coordinates.
 * Only applies when the provider doesn't return distance (city-level search).
 *
 * @param {NormalisedRestaurant[]} restaurants
 * @param {{ lat: number, lon: number }} userCoords
 * @returns {NormalisedRestaurant[]}
 */
function enrichWithDistance(restaurants, userCoords) {
  if (!userCoords?.lat || !userCoords?.lon) return restaurants

  return restaurants.map(r => {
    if (r.distanceM != null) return r // already has distance

    const d = _haversineM(userCoords, r.coordinates)
    const distanceM = isFinite(d) ? Math.round(d) : null
    const distanceLabel = distanceM != null
      ? (distanceM < 1000 ? `${distanceM}m` : `${(distanceM / 1000).toFixed(1)}km`)
      : null

    return { ...r, distanceM, distanceLabel }
  })
}

// ── MongoDB Persistence ───────────────────────────────────────────────────────

/**
 * Upsert a batch of normalised restaurants into MongoDB (fire-and-forget).
 * @param {NormalisedRestaurant[]} restaurants
 * @param {string} [city]
 */
async function persistRestaurants(restaurants, city) {
  const withFsqId = restaurants.filter(r => r.fsqId)
  if (!withFsqId.length) return

  const ops = withFsqId.map(r => ({
    updateOne: {
      filter: { fsqId: r.fsqId },
      update: {
        $set: {
          name:            r.name,
          source:          r.source || 'Foursquare',
          location: {
            type:        'Point',
            coordinates: [r.coordinates.lon, r.coordinates.lat],
          },
          address:         r.address || undefined,
          city:            city || r.city || 'Unknown',
          neighborhood:    r.neighborhood || undefined,
          cuisines:        r.cuisines || [],
          dietaryOptions:  r.dietaryOptions || [],
          tastes:          r.tastes || [],
          averageRating:   r.rating ?? 0,
          reviewCount:     r.totalRatings || 0,
          totalPhotos:     r.totalPhotos || 0,
          popularityScore: r.popularityScore ?? undefined,
          priceLevel:      r.priceLevel || undefined,
          priceInfo:       r.priceInfo || undefined,
          images:          r.photos?.length ? r.photos : (r.image ? [r.image] : []),
          openingHours:    r.openingHours || undefined,
          isOpenNow:       r.isOpenNow ?? undefined,
          phone:           r.phone || undefined,
          website:         r.website || undefined,
          menu:            r.menu || undefined,
          categories:      r.categories || [],
          verified:        r.verified || false,
          description:     r.description || undefined,
          lastFetchedAt:   new Date(),
        },
      },
      upsert: true,
    },
  }))

  try {
    const result = await Restaurant.bulkWrite(ops, { ordered: false })
    logger.info(`[RestaurantsService] Persisted ${result.upsertedCount} new + ${result.modifiedCount} updated restaurants`)
  } catch (err) {
    logger.warn(`[RestaurantsService] DB persist failed (non-fatal): ${err.message}`)
  }
}

function persistAsync(restaurants, city) {
  setImmediate(() => {
    persistRestaurants(restaurants, city).catch(err =>
      logger.warn(`[RestaurantsService] persistAsync error: ${err.message}`)
    )
  })
}

// ── searchByCity ─────────────────────────────────────────────────────────────

/**
 * Search restaurants by city name.
 *
 * Flow:
 *   1. Geocode city → lat/lon using OTM geocoder (cached 24h)
 *   2. Check Redis cache
 *   3. On MISS: FSQ Places search with city coordinates
 *   4. Enrich with calculated distances
 *   5. Sort by composite score
 *   6. Cache + persist (fire-and-forget)
 *
 * @param {string} city — City name e.g. "Goa"
 * @param {Object} [opts]
 * @param {number} [opts.limit=20]        — Max results (1–50)
 * @param {number} [opts.radius=5000]     — Search radius in meters
 * @param {string} [opts.cuisine]         — Cuisine filter (e.g. "Indian")
 * @param {boolean}[opts.openNow=false]   — Only open restaurants
 * @param {number} [opts.minPrice]        — Min price level 1–4
 * @param {number} [opts.maxPrice]        — Max price level 1–4
 * @returns {Promise<{ restaurants: NormalisedRestaurant[], geo: Object|null, total: number, cached: boolean }>}
 */
async function searchByCity(city, opts = {}) {
  const {
    limit    = 20,
    radius   = 5000,
    cuisine,
    openNow  = false,
    minPrice,
    maxPrice,
  } = opts

  const cacheRaw = [
    `city:${city.trim().toLowerCase()}`,
    `r=${radius}`,
    `l=${limit}`,
    `c=${cuisine || ''}`,
    `open=${openNow}`,
    `p=${minPrice || ''}-${maxPrice || ''}`,
  ].join('|')

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const cached = await cacheService.getByNs('restaurants:city', cacheRaw)
  if (cached) {
    logger.info(`[RestaurantsService] CACHE HIT city="${city}"`)
    return { ...cached, cached: true }
  }

  logger.info(`[RestaurantsService] CACHE MISS city="${city}" — fetching from FSQ/OSM`)

  // ── Geocode city ──────────────────────────────────────────────────────────
  const geo = await travelApiService.geocodeDestination(city)
  if (!geo) {
    logger.warn(`[RestaurantsService] Cannot geocode city "${city}"`)
    return { restaurants: [], geo: null, total: 0, cached: false }
  }

  // ── Dining Fetch with Fallback ────────────────────────────────────────────
  let raw = []
  let providerUsed = 'Foursquare'

  const cbState = fsqProvider.circuitBreaker ? await fsqProvider.circuitBreaker.canRequest() : null
  const cbAllowed = cbState ? cbState.allowed : true

  if (fsqProvider.config?.enabled && cbAllowed) {
    try {
      raw = await fsqProvider.searchByCity({
        lat:      geo.lat,
        lon:      geo.lon,
        city,
        radiusM:  radius,
        limit,
        cuisine,
        openNow,
        minPrice,
        maxPrice,
      })
    } catch (err) {
      logger.warn(`[RestaurantsService] Foursquare searchByCity failed, falling back to Overpass: ${err.message}`)
    }
  }

  if (!raw || raw.length === 0) {
    logger.info(`[RestaurantsService] Using keyless Overpass fallback for city="${city}"`)
    providerUsed = 'OpenStreetMap'
    try {
      raw = await osmRestaurantProvider.searchByCity({
        lat:     geo.lat,
        lon:     geo.lon,
        radiusM: radius,
        limit,
      })
    } catch (err) {
      logger.error(`[RestaurantsService] Overpass fallback failed: ${err.message}`)
    }
  }

  const userCoords = { lat: geo.lat, lon: geo.lon }
  const enriched   = enrichWithDistance(raw, userCoords)
  const restaurants = sortRestaurants(enriched, userCoords)

  const result = { restaurants, geo, total: restaurants.length, cached: false, provider: providerUsed }

  // ── Cache store ───────────────────────────────────────────────────────────
  cacheService.set('restaurants:city', cacheRaw, result, TTL.city).catch(err =>
    logger.warn(`[RestaurantsService] Cache SET failed (city): ${err.message}`)
  )

  // ── DB Persist ────────────────────────────────────────────────────────────
  persistAsync(restaurants, city)

  return result
}

// ── searchNearby ─────────────────────────────────────────────────────────────

/**
 * Search restaurants near given coordinates.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Object} [opts]
 * @param {number}  [opts.radius=2000]    — Search radius in meters
 * @param {number}  [opts.limit=20]       — Max results (1–50)
 * @param {string}  [opts.query]          — Free-text query (e.g. "biryani")
 * @param {boolean} [opts.openNow=false]  — Only open restaurants
 * @param {number}  [opts.minPrice]
 * @param {number}  [opts.maxPrice]
 * @param {string}  [opts.sort='RATING']  — RATING | DISTANCE | POPULARITY
 * @returns {Promise<{ restaurants: NormalisedRestaurant[], total: number, cached: boolean }>}
 */
async function searchNearby(lat, lon, opts = {}) {
  const {
    radius   = 2000,
    limit    = 20,
    query,
    openNow  = false,
    minPrice,
    maxPrice,
    sort     = 'RATING',
  } = opts

  const rLat = parseFloat(lat.toFixed(4))
  const rLon = parseFloat(lon.toFixed(4))
  const cacheRaw = [
    `nearby:${rLat},${rLon}`,
    `r=${radius}`,
    `l=${limit}`,
    `q=${query || ''}`,
    `open=${openNow}`,
    `p=${minPrice || ''}-${maxPrice || ''}`,
    `sort=${sort}`,
  ].join('|')

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const cached = await cacheService.getByNs('restaurants:nearby', cacheRaw)
  if (cached) {
    logger.info(`[RestaurantsService] CACHE HIT nearby=(${rLat},${rLon})`)
    return { ...cached, cached: true }
  }

  logger.info(`[RestaurantsService] CACHE MISS nearby=(${rLat},${rLon}) — fetching from FSQ/OSM`)

  // ── Dining Fetch with Fallback ────────────────────────────────────────────
  let raw = []
  let providerUsed = 'Foursquare'

  const cbState = fsqProvider.circuitBreaker ? await fsqProvider.circuitBreaker.canRequest() : null
  const cbAllowed = cbState ? cbState.allowed : true

  if (fsqProvider.config?.enabled && cbAllowed) {
    try {
      raw = await fsqProvider.searchRestaurants({
        lat:      rLat,
        lon:      rLon,
        radiusM:  radius,
        limit,
        query,
        openNow,
        minPrice,
        maxPrice,
        sort,
      })
    } catch (err) {
      logger.warn(`[RestaurantsService] Foursquare searchNearby failed, falling back to Overpass: ${err.message}`)
    }
  }

  if (!raw || raw.length === 0) {
    logger.info(`[RestaurantsService] Using keyless Overpass fallback for nearby=(${rLat}, ${rLon})`)
    providerUsed = 'OpenStreetMap'
    try {
      raw = await osmRestaurantProvider.searchRestaurants({
        lat:     rLat,
        lon:     rLon,
        radiusM: radius,
        limit,
      })
    } catch (err) {
      logger.error(`[RestaurantsService] Overpass fallback failed: ${err.message}`)
    }
  }

  const userCoords  = { lat: rLat, lon: rLon }
  const restaurants = sortRestaurants(raw, userCoords)

  const result = { restaurants, total: restaurants.length, cached: false, provider: providerUsed }

  // ── Cache store ───────────────────────────────────────────────────────────
  cacheService.set('restaurants:nearby', cacheRaw, result, TTL.nearby).catch(err =>
    logger.warn(`[RestaurantsService] Cache SET failed (nearby): ${err.message}`)
  )

  // ── DB Persist ────────────────────────────────────────────────────────────
  persistAsync(restaurants)

  return result
}

// ── getRestaurantDetail ───────────────────────────────────────────────────────

/**
 * Get full restaurant details by Foursquare ID.
 * Checks DB first for a fresh record; fetches from FSQ on miss.
 *
 * @param {string} fsqId — Foursquare place ID
 * @param {Object} [opts]
 * @param {boolean} [opts.forceRefresh=false] — Bypass cache and DB
 * @returns {Promise<NormalisedRestaurant | null>}
 */
async function getRestaurantDetail(fsqId, opts = {}) {
  const { forceRefresh = false } = opts
  if (!fsqId?.trim()) return null

  const cacheRaw = `detail:${fsqId}`

  // ── Cache lookup ──────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = await cacheService.getByNs('restaurants:detail', cacheRaw)
    if (cached) {
      logger.info(`[RestaurantsService] CACHE HIT detail fsqId="${fsqId}"`)
      return { ...cached, cached: true }
    }

    // ── DB lookup ─────────────────────────────────────────────────────────
    try {
      const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000 // 6h
      const dbRecord = await Restaurant.findOne({ fsqId }).lean()

      if (dbRecord && dbRecord.lastFetchedAt) {
        const age = Date.now() - new Date(dbRecord.lastFetchedAt).getTime()
        if (age < STALE_THRESHOLD_MS) {
          logger.info(`[RestaurantsService] DB HIT detail fsqId="${fsqId}" (age ${Math.round(age / 60000)}min)`)

          const fromDB = _reshapeDBRecord(dbRecord)
          cacheService.set('restaurants:detail', cacheRaw, fromDB, TTL.detail).catch(() => {})
          return { ...fromDB, cached: true }
        }
      }
    } catch (err) {
      logger.warn(`[RestaurantsService] DB lookup failed for fsqId="${fsqId}": ${err.message}`)
    }
  }

  logger.info(`[RestaurantsService] CACHE/DB MISS detail fsqId="${fsqId}" — fetching from FSQ`)

  // ── FSQ Fetch ─────────────────────────────────────────────────────────────
  const detail = await fsqProvider.getRestaurantDetail(fsqId)
  if (!detail) return null

  const result = { ...detail, cached: false }

  // ── Cache store ───────────────────────────────────────────────────────────
  cacheService.set('restaurants:detail', cacheRaw, result, TTL.detail).catch(err =>
    logger.warn(`[RestaurantsService] Cache SET failed (detail): ${err.message}`)
  )

  // ── DB Persist ────────────────────────────────────────────────────────────
  persistAsync([detail])

  return result
}

// ── DB record → NormalisedRestaurant ────────────────────────────────────────

function _reshapeDBRecord(r) {
  return {
    id:             `fsq:${r.fsqId}`,
    fsqId:          r.fsqId,
    source:         r.source || 'Foursquare',
    name:           r.name,
    coordinates:    {
      lat: r.location?.coordinates?.[1],
      lon: r.location?.coordinates?.[0],
    },
    address:        r.address || null,
    city:           r.city || null,
    neighborhood:   r.neighborhood || null,
    cuisines:       r.cuisines || [],
    dietaryOptions: r.dietaryOptions || [],
    tastes:         r.tastes || [],
    rating:         r.averageRating || null,
    totalRatings:   r.reviewCount || null,
    totalPhotos:    r.totalPhotos || null,
    popularityScore: r.popularityScore || null,
    priceLevel:     r.priceLevel || null,
    priceInfo:      r.priceInfo || null,
    photos:         r.images || [],
    image:          r.images?.[0] || null,
    openingHours:   r.openingHours || null,
    isOpenNow:      r.isOpenNow ?? null,
    phone:          r.phone || null,
    website:        r.website || null,
    menu:           r.menu || null,
    categories:     r.categories || [],
    verified:       r.verified || false,
    description:    r.description || null,
    distanceM:      null,
    distanceLabel:  null,
  }
}

// ── getProviderHealth ─────────────────────────────────────────────────────────

async function getProviderHealth() {
  return fsqProvider.healthStatus()
}

function isProviderEnabled() {
  return true // Overpass keyless fallback is always enabled
}

module.exports = {
  searchByCity,
  searchNearby,
  getRestaurantDetail,
  getProviderHealth,
  isProviderEnabled,
}
