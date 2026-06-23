// backend/src/controllers/flights.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Flight Search Engine — Express controllers.
//
// Handled routes:
//   GET  /api/v1/flights/health        → provider health + OAuth2 token status
//   GET  /api/v1/flights/airports      → airport autocomplete
//   GET  /api/v1/flights/search        → flight search
//   POST /api/v1/flights/pricing       → confirmed flight pricing
//   GET  /api/v1/flights/airlines      → airline details
// ─────────────────────────────────────────────────────────────────────────────
const flightsService = require('../services/flights.service')
const asyncHandler   = require('../utils/asyncHandler')
const { success, error, notFound, badRequest } = require('../utils/response')
const logger         = require('../utils/logger')

// ── Provider guard ────────────────────────────────────────────────────────────

function providerDisabledResponse(res) {
  return error(
    res,
    'Flight search is unavailable — Amadeus credentials not configured. ' +
    'Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in .env ' +
    '(get free test credentials at https://developers.amadeus.com)',
    503
  )
}

// ── GET /api/v1/flights/airports ──────────────────────────────────────────────

/**
 * Airport autocomplete for search boxes.
 *
 * Query params (validated):
 *   keyword     {string}  required — e.g. "Delhi", "DEL", "Mum"
 *   subType     {string}  optional — 'AIRPORT' | 'CITY' | 'AIRPORT,CITY'
 *   countryCode {string}  optional — e.g. "IN"
 *   limit       {number}  optional — 1–20, default 10
 */
exports.searchAirports = asyncHandler(async (req, res) => {
  if (!flightsService.isProviderEnabled()) return providerDisabledResponse(res)

  const { keyword, subType, countryCode, limit } = req.query
  logger.info(`[FlightsCtrl] searchAirports keyword="${keyword}"`)

  const airports = await flightsService.searchAirports({
    keyword,
    subType,
    countryCode,
    limit: parseInt(limit, 10) || 10,
  })

  success(
    res,
    { airports, total: airports.length, query: keyword },
    airports.length > 0
      ? `Found ${airports.length} airport${airports.length !== 1 ? 's' : ''} matching "${keyword}"`
      : `No airports found for "${keyword}"`
  )
})

// ── GET /api/v1/flights/search ────────────────────────────────────────────────

/**
 * Search available flights.
 *
 * Query params (validated by Joi):
 *   origin        {string}  required — IATA code (e.g. "DEL")
 *   destination   {string}  required — IATA code (e.g. "BOM")
 *   departureDate {string}  required — YYYY-MM-DD
 *   returnDate    {string}  optional — YYYY-MM-DD (round trip)
 *   adults        {number}  optional — default 1
 *   children      {number}  optional — default 0
 *   infants       {number}  optional — default 0
 *   travelClass   {string}  optional — ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
 *   max           {number}  optional — 1–50, default 10
 *   nonStop       {boolean} optional — default false
 */
exports.searchFlights = asyncHandler(async (req, res) => {
  if (!flightsService.isProviderEnabled()) return providerDisabledResponse(res)

  const {
    origin, destination, departureDate, returnDate,
    adults, children, infants, travelClass, max, nonStop,
  } = req.query

  logger.info(`[FlightsCtrl] searchFlights ${origin}→${destination} on ${departureDate}`)

  const result = await flightsService.searchFlights({
    origin:        origin.toUpperCase(),
    destination:   destination.toUpperCase(),
    departureDate,
    returnDate:    returnDate || undefined,
    adults:        parseInt(adults, 10) || 1,
    children:      parseInt(children, 10) || 0,
    infants:       parseInt(infants, 10) || 0,
    travelClass:   travelClass || 'ECONOMY',
    max:           parseInt(max, 10) || 10,
    nonStop:       nonStop === 'true' || nonStop === true,
  })

  success(
    res,
    {
      flights:     result.flights,
      total:       result.total,
      isRoundTrip: result.isRoundTrip,
      meta:        result.meta,
      provider:    'Amadeus',
    },
    result.total > 0
      ? `Found ${result.total} flight${result.total !== 1 ? 's' : ''} from ${origin} to ${destination}`
      : `No flights found from ${origin} to ${destination} on ${departureDate}`
  )
})

// ── POST /api/v1/flights/pricing ──────────────────────────────────────────────

/**
 * Confirm and lock current pricing for a specific flight offer.
 * Always call before booking to ensure price is still valid.
 *
 * Body (validated by Joi):
 *   offer {Object} — The raw Amadeus flight offer from the search result
 *
 * Response:
 *   confirmedOffer — Same structure as searchFlights result with confirmed price
 *   priceChanged   — true if the price changed since the search
 *   priceDiffINR   — INR difference (positive = price went up)
 */
exports.confirmPricing = asyncHandler(async (req, res) => {
  if (!flightsService.isProviderEnabled()) return providerDisabledResponse(res)

  const { offer } = req.body
  if (!offer?.id) return badRequest(res, 'Flight offer with id is required in request body')

  logger.info(`[FlightsCtrl] confirmPricing offer="${offer.id}"`)

  const confirmed = await flightsService.confirmPricing(offer)

  if (!confirmed) {
    return error(
      res,
      'Unable to confirm pricing for this flight. The offer may have expired — please search again.',
      422
    )
  }

  // Detect price change (compare to original offer price if available)
  const originalINR = offer.__originalINR || null
  const priceChanged = originalINR != null && confirmed.totalINR !== originalINR
  const priceDiffINR = priceChanged ? confirmed.totalINR - originalINR : 0

  success(
    res,
    {
      confirmedOffer: confirmed,
      priceChanged,
      priceDiffINR,
      priceAlert: priceChanged
        ? (priceDiffINR > 0
            ? `Price increased by ₹${priceDiffINR.toLocaleString()}`
            : `Price decreased by ₹${Math.abs(priceDiffINR).toLocaleString()}`)
        : null,
      provider: 'Amadeus',
    },
    priceChanged
      ? `Price confirmed with change: ₹${confirmed.totalINR.toLocaleString()}`
      : `Price confirmed: ₹${confirmed.totalINR.toLocaleString()}`
  )
})

// ── GET /api/v1/flights/airlines ──────────────────────────────────────────────

/**
 * Get airline details by IATA code(s).
 *
 * Query params:
 *   codes {string} required — comma-separated IATA codes (e.g. "6E,AI,SG")
 */
exports.getAirlines = asyncHandler(async (req, res) => {
  if (!flightsService.isProviderEnabled()) return providerDisabledResponse(res)

  const { codes } = req.query
  const codeList = codes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)

  logger.info(`[FlightsCtrl] getAirlines codes=[${codeList.join(',')}]`)

  const airlines = await flightsService.getAirlineDetails(codeList)

  if (!airlines.length) {
    return notFound(res, `No airline details found for codes: ${codeList.join(', ')}`)
  }

  success(res, { airlines, total: airlines.length }, `Airline details for ${codeList.join(', ')}`)
})

// ── GET /api/v1/flights/health ────────────────────────────────────────────────

/**
 * Provider health: OAuth2 token availability, enabled status, environment.
 */
exports.getHealth = asyncHandler(async (req, res) => {
  const health  = await flightsService.getProviderHealth()
  const enabled = flightsService.isProviderEnabled()

  success(res, {
    provider: health,
    enabled,
    service: 'FlightSearchEngine',
    note:    health.env === 'test'
      ? 'Running against Amadeus test environment — switch to production for live data'
      : 'Running against Amadeus production environment',
  }, 'Flight provider health check')
})
