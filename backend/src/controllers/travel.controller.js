// backend/src/controllers/travel.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Express controller for the /api/v1/travel/* endpoints.
//
// Routes exposed:
//   GET  /api/v1/travel/attractions          — search attractions by city/coords
//   GET  /api/v1/travel/attractions/geocode  — resolve city name → lat/lon
//   GET  /api/v1/travel/health               — provider health status
//
// All attraction data is sourced from:
//   Primary:   OpenStreetMap Overpass API (no key, free)
//   Secondary: Foursquare Places v3 (free tier, invoked only on insufficient primary results)
//
// Redis caching is handled transparently inside each provider via BaseProvider.
// ─────────────────────────────────────────────────────────────────────────────
const asyncHandler   = require('../utils/asyncHandler')
const { success, badRequest } = require('../utils/response')
const logger         = require('../utils/logger')

const overpassProvider = require('../services/travel/providers/overpass.provider')
const foursquareProvider = require('../services/travel/providers/foursquare.provider')
const attractionsAgg = require('../services/travel/aggregators/attractions.aggregator')
const { geocodeDestination, healthCheck } = require('../services/travel/travelApi.service')

// ── Validation helpers ────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'all', 'sightseeing', 'heritage', 'culture', 'nature', 'viewpoint', 'spiritual', 'entertainment',
])

function parseCategories(raw) {
  if (!raw) return ['all']
  return raw.split(',')
    .map(c => c.trim().toLowerCase())
    .filter(c => VALID_CATEGORIES.has(c))
}

// ── GET /api/v1/travel/attractions ────────────────────────────────────────

/**
 * Search tourist attractions for a destination.
 *
 * Query params:
 *   destination  string   — City name, e.g. "Goa" (required if lat/lon absent)
 *   lat          number   — Latitude (optional, skip geocoding if provided)
 *   lon          number   — Longitude (optional, skip geocoding if provided)
 *   radius       number   — Search radius in metres (default 10000, max 15000)
 *   limit        number   — Max results (default 20, max 40)
 *   categories   string   — Comma-separated: all|sightseeing|heritage|culture|nature|viewpoint|spiritual
 *
 * Response:
 *   {
 *     destination, coordinates, radius, total,
 *     attractions: NormalisedAttraction[],
 *     source: { primary, secondary },
 *     cached: boolean
 *   }
 */
exports.getAttractions = asyncHandler(async (req, res) => {
  const {
    destination,
    lat: latStr,
    lon: lonStr,
    radius: radiusStr,
    limit: limitStr,
    categories: categoriesStr,
  } = req.query

  // ── Coordinate resolution ─────────────────────────────────────────────
  let lat = parseFloat(latStr)
  let lon = parseFloat(lonStr)
  let resolvedName = destination

  if (isNaN(lat) || isNaN(lon)) {
    // Geocode from destination name
    if (!destination || destination.trim().length < 2) {
      return badRequest(res, 'Provide `destination` (city name) or `lat`+`lon` coordinates')
    }

    const geo = await geocodeDestination(destination.trim())
    if (!geo) {
      return res.status(404).json({
        success: false,
        message: `Could not geocode destination "${destination}". Try a more specific city name.`,
      })
    }

    lat = geo.lat
    lon = geo.lon
    resolvedName = geo.name || destination
  }

  // ── Parameter parsing ─────────────────────────────────────────────────
  const radiusM = Math.min(parseInt(radiusStr, 10) || 12000, 15000)
  const limit   = Math.min(parseInt(limitStr, 10) || 20, 40)
  const categories = parseCategories(categoriesStr)

  logger.info(`[TravelCtrl] Attractions: "${resolvedName}" (${lat}, ${lon}) r=${radiusM}m limit=${limit}`)

  // ── Fetch from primary (Overpass) ─────────────────────────────────────
  let primaryResults = []
  let secondaryResults = []
  let usedSecondary = false

  try {
    primaryResults = await overpassProvider.fetchAttractions({ lat, lon, radiusM, limit })
  } catch (err) {
    logger.warn(`[TravelCtrl] Overpass failed: ${err.message}`)
  }

  // ── Invoke secondary (Foursquare) if primary insufficient ─────────────
  const MIN_PRIMARY = 5
  if (primaryResults.length < MIN_PRIMARY && foursquareProvider.config.enabled) {
    logger.info(`[TravelCtrl] Primary returned ${primaryResults.length}/${MIN_PRIMARY} — invoking Foursquare`)
    try {
      secondaryResults = await foursquareProvider.fetchAttractions({ lat, lon, radiusM, limit })
      usedSecondary = true
    } catch (err) {
      logger.warn(`[TravelCtrl] Foursquare fallback failed: ${err.message}`)
    }
  }

  // ── Aggregate + filter by category ───────────────────────────────────
  let merged = attractionsAgg.aggregate(primaryResults, secondaryResults)

  // Category filter (skip when 'all')
  if (!categories.includes('all')) {
    const catSet = new Set(categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)))
    merged = merged.filter(a => catSet.has(a.category))
  }

  // ── Response ──────────────────────────────────────────────────────────
  res.setHeader('X-Data-Source', 'OpenStreetMap')
  res.setHeader('X-Provider-Secondary', usedSecondary ? 'Foursquare' : 'none')

  return success(res, {
    destination:   resolvedName,
    coordinates:   { lat, lon },
    radiusM,
    total:         merged.length,
    attractions:   merged,
    source: {
      primary:     'OpenStreetMap (Overpass API)',
      secondary:   usedSecondary ? 'Foursquare' : null,
    },
    filters: {
      categories,
      limit,
    },
  }, `Found ${merged.length} attractions near ${resolvedName}`)
})

// ── GET /api/v1/travel/attractions/geocode ────────────────────────────────

/**
 * Resolve a city name to lat/lon using Nominatim.
 * Useful for client-side map centering before fetching attractions.
 *
 * Query params:
 *   q  string  — City or place name (required)
 */
exports.geocode = asyncHandler(async (req, res) => {
  const { q } = req.query

  if (!q || q.trim().length < 2) {
    return badRequest(res, 'Query param `q` is required (min 2 characters)')
  }

  const geo = await geocodeDestination(q.trim())

  if (!geo) {
    return res.status(404).json({
      success: false,
      message: `Could not geocode "${q}". Try a more specific city name, e.g. "Goa, India".`,
    })
  }

  return success(res, {
    query:       q,
    lat:         geo.lat,
    lon:         geo.lon,
    name:        geo.name,
    displayName: geo.displayName,
    country:     geo.country,
    source:      'Nominatim (OpenStreetMap)',
    cached:      true, // Nominatim results are always cached in Redis for 24h
  }, 'Geocoding successful')
})

// ── GET /api/v1/travel/health ─────────────────────────────────────────────

/**
 * Return health status for all registered travel API providers.
 * Used by admin monitoring dashboard.
 */
exports.getHealth = asyncHandler(async (req, res) => {
  const statuses = await healthCheck()

  const allHealthy = statuses.every(s => s.circuitBreaker?.state === 'CLOSED' || !s.circuitBreaker)

  res.status(allHealthy ? 200 : 207).json({
    success: true,
    allHealthy,
    providers: statuses,
    checkedAt: new Date().toISOString(),
  })
})
