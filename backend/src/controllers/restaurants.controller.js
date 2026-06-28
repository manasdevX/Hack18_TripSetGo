// backend/src/controllers/restaurants.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Discovery API — Express controllers.
//
// Handled routes:
//   GET /api/v1/restaurants/health         → provider health check
//   GET /api/v1/restaurants/city           → search by city
//   GET /api/v1/restaurants/nearby         → search by coordinates
//   GET /api/v1/restaurants/:fsqId         → get full details by FSQ ID
//
// All handlers use asyncHandler for error forwarding.
// Input is pre-validated by validate.middleware.js (Joi schemas).
// ─────────────────────────────────────────────────────────────────────────────
const restaurantsService = require('../services/restaurants.service')
const asyncHandler       = require('../utils/asyncHandler')
const { success, error, notFound } = require('../utils/response')
const logger             = require('../utils/logger')

// ── Provider guard helper ─────────────────────────────────────────────────────

function providerDisabledResponse(res) {
  return error(
    res,
    'Restaurant discovery service is unavailable — provider not configured. ' +
    'Set FOURSQUARE_API_KEY_1 in .env (get a free key at https://foursquare.com/developers/)',
    503
  )
}

// ── GET /api/v1/restaurants/city ──────────────────────────────────────────────

/**
 * Search restaurants by city name.
 *
 * Query params (validated by Joi):
 *   city      {string}  required — e.g. "Goa"
 *   limit     {number}  optional — 1–50, default 20
 *   radius    {number}  optional — meters, default 5000
 *   cuisine   {string}  optional — e.g. "Indian", "Pizza"
 *   openNow   {boolean} optional — default false
 *   minPrice  {number}  optional — 1–4
 *   maxPrice  {number}  optional — 1–4
 */
exports.searchByCity = asyncHandler(async (req, res) => {

  const { city, limit, radius, cuisine, openNow, minPrice, maxPrice } = req.query

  logger.info(`[RestaurantsCtrl] searchByCity city="${city}" limit=${limit} radius=${radius}`)

  const result = await restaurantsService.searchByCity(city, {
    limit:    parseInt(limit, 10)    || 20,
    radius:   parseInt(radius, 10)   || 5000,
    cuisine:  cuisine                || undefined,
    openNow:  openNow === true || openNow === 'true',
    minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
  })

  success(
    res,
    {
      restaurants: result.restaurants,
      geo:         result.geo,
      total:       result.total,
      cached:      result.cached,
      meta: {
        city,
        radius:   parseInt(radius, 10) || 5000,
        limit:    parseInt(limit, 10)  || 20,
        cuisine:  cuisine || null,
        openNow:  openNow === true || openNow === 'true',
        minPrice: minPrice ? parseInt(minPrice, 10) : null,
        maxPrice: maxPrice ? parseInt(maxPrice, 10) : null,
        provider: result.provider || 'OpenStreetMap',
      },
    },
    result.total > 0
      ? `Found ${result.total} restaurant${result.total !== 1 ? 's' : ''} in ${city}`
      : `No restaurants found in ${city}`
  )
})

// ── GET /api/v1/restaurants/nearby ───────────────────────────────────────────

/**
 * Search restaurants near coordinates.
 *
 * Query params (validated by Joi):
 *   lat       {number}  required
 *   lon       {number}  required
 *   radius    {number}  optional — meters, default 2000
 *   limit     {number}  optional — 1–50, default 20
 *   query     {string}  optional — e.g. "biryani"
 *   openNow   {boolean} optional
 *   minPrice  {number}  optional
 *   maxPrice  {number}  optional
 *   sort      {string}  optional — RATING | DISTANCE | POPULARITY
 */
exports.searchNearby = asyncHandler(async (req, res) => {

  const { lat, lon, radius, limit, query, openNow, minPrice, maxPrice, sort } = req.query

  const parsedLat = parseFloat(lat)
  const parsedLon = parseFloat(lon)

  logger.info(`[RestaurantsCtrl] searchNearby lat=${parsedLat} lon=${parsedLon} radius=${radius}`)

  const result = await restaurantsService.searchNearby(parsedLat, parsedLon, {
    radius:   parseInt(radius, 10)   || 2000,
    limit:    parseInt(limit, 10)    || 20,
    query:    query                  || undefined,
    openNow:  openNow === true || openNow === 'true',
    minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
    sort:     sort || 'RATING',
  })

  success(
    res,
    {
      restaurants: result.restaurants,
      total:       result.total,
      cached:      result.cached,
      meta: {
        coordinates: { lat: parsedLat, lon: parsedLon },
        radius:   parseInt(radius, 10) || 2000,
        limit:    parseInt(limit, 10)  || 20,
        query:    query || null,
        openNow:  openNow === true || openNow === 'true',
        sort:     sort || 'RATING',
        provider: result.provider || 'OpenStreetMap',
      },
    },
    result.total > 0
      ? `Found ${result.total} nearby restaurant${result.total !== 1 ? 's' : ''}`
      : 'No nearby restaurants found'
  )
})

// ── GET /api/v1/restaurants/:fsqId ───────────────────────────────────────────

/**
 * Get full restaurant details by Foursquare ID.
 *
 * Path params (validated by Joi):
 *   fsqId     {string}  required — FSQ place ID
 *
 * Query params:
 *   refresh   {boolean} optional — bypass cache, force re-fetch
 */
exports.getDetail = asyncHandler(async (req, res) => {
  if (!restaurantsService.isProviderEnabled()) return providerDisabledResponse(res)

  const { fsqId }       = req.params
  const forceRefresh    = req.query.refresh === 'true'

  logger.info(`[RestaurantsCtrl] getDetail fsqId="${fsqId}" refresh=${forceRefresh}`)

  const restaurant = await restaurantsService.getRestaurantDetail(fsqId, { forceRefresh })

  if (!restaurant) {
    return notFound(res, `Restaurant with id "${fsqId}" not found`)
  }

  success(res, { restaurant }, `Restaurant details for "${restaurant.name || fsqId}"`)
})

// ── GET /api/v1/restaurants/health ───────────────────────────────────────────

/**
 * Provider health check.
 * Returns circuit breaker state, key availability, and enabled flag.
 */
exports.getHealth = asyncHandler(async (req, res) => {
  const health  = await restaurantsService.getProviderHealth()
  const enabled = restaurantsService.isProviderEnabled()

  success(res, { provider: health, enabled }, 'Restaurant provider health check')
})
