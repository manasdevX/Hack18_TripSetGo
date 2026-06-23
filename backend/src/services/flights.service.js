// backend/src/services/flights.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Flight Search Engine Service — high-level business logic layer.
//
// Orchestrates:
//   1. Redis cache lookup per endpoint
//   2. Amadeus OAuth2 token lifecycle (handled in provider)
//   3. Flight search, pricing confirmation, airport autocomplete, airline info
//   4. Response enrichment (airline names, travel duration display, INR pricing)
//
// Public API:
//   searchAirports(params)       → NormalisedAirport[] (autocomplete)
//   searchFlights(params)        → NormalisedFlightOffer[] (search)
//   confirmPricing(offerId, raw) → NormalisedFlightOffer (confirmed price)
//   getAirlineDetails(codes)     → NormalisedAirline[]
//   getProviderHealth()          → health status object
//   isProviderEnabled()          → boolean
//
// Caching strategy (all managed by the provider's fetchWithCache):
//   Namespace         TTL     Use
//   ──────────────────────────────────────────────────────────
//   flights:airports  86400s  Airport autocomplete (24h — static data)
//   flights:search    600s    Flight search results (10 min — prices shift)
//   flights:airlines  86400s  Airline name/details (24h — static data)
//
// Pricing confirmation is NOT cached — always calls Amadeus to get
// the current confirmed price before a booking attempt.
// ─────────────────────────────────────────────────────────────────────────────
const flightProvider = require('./travel/providers/amadeus.flight.provider')
const logger         = require('../utils/logger')

// ── searchAirports ────────────────────────────────────────────────────────────

/**
 * Search airports and cities for autocomplete.
 * Useful for "where are you flying from?" text boxes.
 *
 * @param {Object} params
 * @param {string}  params.keyword      — Partial airport name or IATA code
 * @param {string}  [params.subType]    — 'AIRPORT' | 'CITY' | 'AIRPORT,CITY'
 * @param {string}  [params.countryCode]— Restrict to country (ISO 3166 alpha-2)
 * @param {number}  [params.limit=10]   — Max results (1–20)
 * @returns {Promise<NormalisedAirport[]>}
 */
async function searchAirports(params) {
  logger.info(`[FlightsService] searchAirports keyword="${params?.keyword}"`)
  return flightProvider.searchAirports(params)
}

// ── searchFlights ─────────────────────────────────────────────────────────────

/**
 * Search available flights between two airports.
 *
 * @param {Object} params
 * @param {string}  params.origin         — Origin IATA code (e.g. "DEL")
 * @param {string}  params.destination    — Destination IATA code (e.g. "BOM")
 * @param {string}  params.departureDate  — ISO date 'YYYY-MM-DD'
 * @param {string}  [params.returnDate]   — Round trip return date
 * @param {number}  [params.adults=1]
 * @param {number}  [params.children=0]
 * @param {number}  [params.infants=0]
 * @param {string}  [params.travelClass='ECONOMY']
 * @param {number}  [params.max=10]       — Max results (1–50)
 * @param {boolean} [params.nonStop=false]
 * @returns {Promise<{ flights: NormalisedFlightOffer[], total: number, meta: Object }>}
 */
async function searchFlights(params) {
  const {
    origin, destination, departureDate, returnDate,
    adults = 1, children = 0, infants = 0,
    travelClass = 'ECONOMY', max = 10, nonStop = false,
  } = params

  logger.info(`[FlightsService] searchFlights ${origin}→${destination} on ${departureDate}`)

  const flights = await flightProvider.searchFlights({
    origin, destination, departureDate, returnDate,
    adults, children, infants, travelClass, max, nonStop,
  })

  return {
    flights,
    total:      flights.length,
    isRoundTrip: !!returnDate,
    meta: {
      origin,
      destination,
      departureDate,
      returnDate:   returnDate || null,
      passengers:   { adults, children, infants, total: adults + children + infants },
      travelClass,
      nonStop,
    },
  }
}

// ── confirmPricing ────────────────────────────────────────────────────────────

/**
 * Confirm current pricing for a specific flight offer.
 * Must be called before booking to ensure price accuracy.
 *
 * NOTE: Accepts the RAW Amadeus flight offer object (not the normalised form).
 * The caller must have stored the raw offer from the initial search response.
 * In practice, the frontend sends back the offer it received; the controller
 * passes it directly to this function.
 *
 * @param {Object} rawOffer — The original Amadeus flight offer object
 * @returns {Promise<NormalisedFlightOffer | null>}
 */
async function confirmPricing(rawOffer) {
  if (!rawOffer) return null
  logger.info(`[FlightsService] confirmPricing for offer id="${rawOffer?.id}"`)
  return flightProvider.confirmPricing(rawOffer)
}

// ── getAirlineDetails ─────────────────────────────────────────────────────────

/**
 * Get airline name/details by IATA code(s).
 *
 * @param {string|string[]} codes — IATA airline code(s), e.g. "6E" or ["6E","AI"]
 * @returns {Promise<NormalisedAirline[]>}
 */
async function getAirlineDetails(codes) {
  const codeList = Array.isArray(codes) ? codes : [codes]
  logger.info(`[FlightsService] getAirlineDetails codes=[${codeList.join(',')}]`)
  return flightProvider.getAirlines(codeList)
}

// ── getProviderHealth ─────────────────────────────────────────────────────────

async function getProviderHealth() {
  return flightProvider.healthStatus()
}

function isProviderEnabled() {
  return flightProvider.isEnabled()
}

module.exports = {
  searchAirports,
  searchFlights,
  confirmPricing,
  getAirlineDetails,
  getProviderHealth,
  isProviderEnabled,
}
