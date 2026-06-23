// backend/src/controllers/attractions.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Attractions Discovery API — Express controllers.
//
// Routes handled:
//   GET /api/v1/attractions/city      → searchByCity
//   GET /api/v1/attractions/nearby    → searchNearby
//   GET /api/v1/attractions/:xid      → getDetail
//   GET /api/v1/attractions/health    → getHealth
//
// All handlers are wrapped in asyncHandler for automatic error forwarding.
// Input is already validated by validate.middleware.js before reaching here.
// ─────────────────────────────────────────────────────────────────────────────
const attractionsService = require('../services/attractions.service')
const asyncHandler       = require('../utils/asyncHandler')
const { success, error, notFound } = require('../utils/response')
const logger             = require('../utils/logger')

// ── GET /api/v1/attractions/city ──────────────────────────────────────────────

/**
 * Search attractions by city name.
 *
 * Query params (validated by Joi):
 *   city     {string}  required — e.g. "Jaipur"
 *   limit    {number}  optional — 1–50, default 20
 *   radius   {number}  optional — meters, default 12000
 *   kinds    {string}  optional — comma-separated OTM kinds
 *
 * Response:
 *   { success, message, data: { attractions[], geo, total, cached } }
 */
exports.searchByCity = asyncHandler(async (req, res) => {
  const { city, limit, radius, kinds } = req.query

  // Guard: provider must be enabled
  if (!attractionsService.isProviderEnabled()) {
    return error(
      res,
      'Attractions service is temporarily unavailable — provider not configured. Set OPENTRIPMAP_API_KEY in .env',
      503
    )
  }

  logger.info(`[AttractionsCtrl] searchByCity city="${city}" limit=${limit} radius=${radius}`)

  const result = await attractionsService.searchByCity(city, {
    limit:  parseInt(limit, 10) || 20,
    radius: parseInt(radius, 10) || 12000,
    kinds,
  })

  // Enrich response metadata
  const data = {
    attractions: result.attractions,
    geo:         result.geo,
    total:       result.total,
    cached:      result.cached,
    meta: {
      city,
      radius:    parseInt(radius, 10) || 12000,
      limit:     parseInt(limit, 10) || 20,
      kinds:     kinds || null,
      provider:  'OpenTripMap',
    },
  }

  success(
    res,
    data,
    result.total > 0
      ? `Found ${result.total} attraction${result.total !== 1 ? 's' : ''} in ${city}`
      : `No attractions found in ${city}`
  )
})

// ── GET /api/v1/attractions/nearby ────────────────────────────────────────────

/**
 * Search attractions near coordinates.
 *
 * Query params (validated by Joi):
 *   lat      {number}  required — latitude
 *   lon      {number}  required — longitude
 *   radius   {number}  optional — meters, default 5000
 *   limit    {number}  optional — 1–50, default 20
 *   kinds    {string}  optional — comma-separated OTM kinds
 *
 * Response:
 *   { success, message, data: { attractions[], total, cached } }
 */
exports.searchNearby = asyncHandler(async (req, res) => {
  const { lat, lon, radius, limit, kinds } = req.query

  if (!attractionsService.isProviderEnabled()) {
    return error(
      res,
      'Attractions service is temporarily unavailable — provider not configured. Set OPENTRIPMAP_API_KEY in .env',
      503
    )
  }

  const parsedLat = parseFloat(lat)
  const parsedLon = parseFloat(lon)

  logger.info(`[AttractionsCtrl] searchNearby lat=${parsedLat} lon=${parsedLon} radius=${radius}`)

  const result = await attractionsService.searchNearby(parsedLat, parsedLon, {
    radius: parseInt(radius, 10) || 5000,
    limit:  parseInt(limit, 10) || 20,
    kinds,
  })

  const data = {
    attractions: result.attractions,
    total:       result.total,
    cached:      result.cached,
    meta: {
      coordinates: { lat: parsedLat, lon: parsedLon },
      radius:      parseInt(radius, 10) || 5000,
      limit:       parseInt(limit, 10) || 20,
      kinds:       kinds || null,
      provider:    'OpenTripMap',
    },
  }

  success(
    res,
    data,
    result.total > 0
      ? `Found ${result.total} nearby attraction${result.total !== 1 ? 's' : ''}`
      : 'No nearby attractions found'
  )
})

// ── GET /api/v1/attractions/:xid ──────────────────────────────────────────────

/**
 * Get full attraction details by OTM xid.
 *
 * Path params (validated by Joi):
 *   xid      {string}  required — OTM unique attraction ID
 *
 * Query params:
 *   refresh  {boolean} optional — bypass cache, force re-fetch from OTM
 *
 * Response:
 *   { success, message, data: { attraction } }
 */
exports.getDetail = asyncHandler(async (req, res) => {
  const { xid } = req.params
  const forceRefresh = req.query.refresh === 'true'

  if (!attractionsService.isProviderEnabled()) {
    return error(
      res,
      'Attractions service is temporarily unavailable — provider not configured. Set OPENTRIPMAP_API_KEY in .env',
      503
    )
  }

  logger.info(`[AttractionsCtrl] getDetail xid="${xid}" refresh=${forceRefresh}`)

  const attraction = await attractionsService.getAttractionDetail(xid, {
    forceRefresh,
  })

  if (!attraction) {
    return notFound(res, `Attraction with id "${xid}" not found`)
  }

  success(res, { attraction }, `Attraction details for "${attraction.name || xid}"`)
})

// ── GET /api/v1/attractions/health ────────────────────────────────────────────

/**
 * Provider health check.
 * Returns circuit breaker status, key availability, and enabled flag.
 */
exports.getHealth = asyncHandler(async (req, res) => {
  const health = await attractionsService.getProviderHealth()
  success(res, { provider: health }, 'Attractions provider health check')
})
