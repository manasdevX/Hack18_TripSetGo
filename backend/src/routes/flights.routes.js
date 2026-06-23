// backend/src/routes/flights.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Flight Search Engine routes.
//
// Base path: /api/v1/flights  (mounted in routes/index.js)
//
// Endpoints:
//   GET  /health    → provider health + OAuth2 token availability (no cache)
//   GET  /airports  → airport autocomplete (24h cache — static data)
//   GET  /search    → flight search (10 min cache — prices change)
//   POST /pricing   → confirmed pricing (NO cache — always live from Amadeus)
//   GET  /airlines  → airline details (24h cache — static data)
//
// Route ordering:
//   All named routes before any future dynamic segments to prevent
//   accidental path swallowing. POST /pricing kept after GET routes.
//
// Cache namespaces (defined in cache.service.js TTL registry):
//   flights:airports → 86400s (24h)
//   flights:search   → 600s   (10 min)
//   flights:airlines → 86400s (24h)
//
// POST /pricing has NO cache middleware — pricing must always be live.
// ─────────────────────────────────────────────────────────────────────────────
const router         = require('express').Router()
const flightsCtrl    = require('../controllers/flights.controller')
const cache          = require('../middleware/cache.middleware')
const validate       = require('../middleware/validate.middleware')
const { optionalAuth } = require('../middleware/auth.middleware')

const {
  airportSearchSchema,
  flightSearchSchema,
  pricingSchema,
  airlineSchema,
} = require('../validators/flights.validator')

// ── Health check (no cache, no auth) ─────────────────────────────────────────
router.get(
  '/health',
  flightsCtrl.getHealth
)

// ── Airport autocomplete (24h cache — airport data is static) ─────────────────
//
// GET /api/v1/flights/airports?keyword=Delhi&subType=AIRPORT,CITY&limit=10
// GET /api/v1/flights/airports?keyword=DEL&countryCode=IN
router.get(
  '/airports',
  optionalAuth,
  validate({ query: airportSearchSchema }),
  cache('flights:airports', 86400),
  flightsCtrl.searchAirports
)

// ── Flight search (10 min cache — prices can change) ──────────────────────────
//
// GET /api/v1/flights/search?origin=DEL&destination=BOM&departureDate=2025-01-10
// GET /api/v1/flights/search?origin=DEL&destination=DXB&departureDate=2025-01-10&returnDate=2025-01-17&adults=2&travelClass=BUSINESS
// GET /api/v1/flights/search?origin=BOM&destination=SIN&departureDate=2025-01-10&nonStop=true
router.get(
  '/search',
  optionalAuth,
  validate({ query: flightSearchSchema }),
  cache('flights:search', 600),
  flightsCtrl.searchFlights
)

// ── Airline details (24h cache — static data) ─────────────────────────────────
//
// GET /api/v1/flights/airlines?codes=6E,AI,SG
router.get(
  '/airlines',
  optionalAuth,
  validate({ query: airlineSchema }),
  cache('flights:airlines', 86400),
  flightsCtrl.getAirlines
)

// ── Confirm pricing (NO cache — must always be live) ─────────────────────────
//
// POST /api/v1/flights/pricing
// Body: { "offer": { ...rawAmadeusFlightOffer } }
//
// Always call this before attempting a booking to confirm current price.
// Amadeus may return a different price if market prices shifted.
router.post(
  '/pricing',
  optionalAuth,
  validate({ body: pricingSchema }),
  flightsCtrl.confirmPricing
)

module.exports = router
