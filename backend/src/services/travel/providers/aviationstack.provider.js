// backend/src/services/travel/providers/aviationstack.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// AviationStack API Provider — Flights, Airports, Airlines, Flight Status.
//
// APIs used:
//   GET /v1/airports  — airport search by keyword or city
//   GET /v1/flights   — flight schedules and live status
//   GET /v1/airlines  — airline details by IATA code
//
// Authentication:
//   All requests use ?access_key=<API_KEY> query param.
//   Key rotation handled by ApiKeyRotator (inherited from BaseProvider).
//
// Free tier constraints (500 req/month):
//   - HTTP only (not HTTPS) on free plan
//   - No real-time data on free plan (use scheduled/historical data)
//   - Aggressive Redis caching is critical to stay within quota
//
// Caching strategy:
//   Namespace              TTL      Reason
//   ─────────────────────────────────────────────────────────────────
//   flights:airports       24h      IATA data is near-static
//   flights:airports:city  7 days   City→airports is very stable
//   flights:search         30 min   Schedules semi-stable
//   flights:airlines       24h      Airline metadata is static
//   flights:status         2 min    Live status changes rapidly
//
// Normalised schemas:
//   NormalisedAirport  — { iataCode, icaoCode, name, city, country, coordinates, timezone }
//   NormalisedFlight   — { airline, flightNumber, departureAirport, arrivalAirport, ... }
//   NormalisedAirline  — { name, iataCode, icaoCode, country, active }
// ─────────────────────────────────────────────────────────────────────────────
const BaseProvider  = require('./BaseProvider')
const adapter       = require('../adapters/aviationstack.adapter')
const travelLogger  = require('../utils/travelLogger')
const providersCfg  = require('../../../config/travelProviders.config')
const cacheService  = require('../../cache.service')

// ── Cache TTL Constants ──────────────────────────────────────────────────────
const TTL = {
  airports:     86400,  // 24 h
  airportsCity: 604800, // 7 days
  airlines:     86400,  // 24 h
  schedules:    1800,   // 30 min
  status:       120,    // 2 min
}

class AviationStackProvider extends BaseProvider {
  constructor() {
    super(providersCfg.aviationStack)
    this.name = 'AviationStack'
  }

  // ── Auth override — AviationStack uses ?access_key= query param ─────────────

  async request(path, params = {}, headers = {}) {
    const key = this.keyRotator.next()
    if (key) params.access_key = key
    return super.request(path, params, headers)
  }

  // ── searchAirports ────────────────────────────────────────────────────────
  // Search airports by name, IATA code, or keyword.

  /**
   * @param {Object} params
   * @param {string}  params.keyword — partial name or IATA code (e.g. "Delhi", "DEL")
   * @param {number}  [params.limit=10]
   * @returns {Promise<NormalisedAirport[]>}
   */
  async searchAirports({ keyword, limit = 10 } = {}) {
    if (!this.config.enabled) {
      travelLogger.warn(this.name, 'Provider disabled — AVIATIONSTACK_API_KEY_1 not set')
      return []
    }
    if (!keyword || keyword.trim().length < 2) return []

    const cacheKey = `avstack:airports:kw:${keyword.toLowerCase().trim()}:l${limit}`
    const cached   = await cacheService.getByNs('flights:airports', cacheKey)
    if (cached) {
      travelLogger.debug(this.name, `Airport search cache HIT for "${keyword}"`)
      return cached
    }

    try {
      travelLogger.info(this.name, `Searching airports by keyword="${keyword}"`)
      const raw = await this.request('/airports', {
        search: keyword.trim(),
        limit:  Math.min(limit, 100),
      })

      const airports = adapter.normaliseAirports(raw?.data || [])
      cacheService.set('flights:airports', cacheKey, airports, TTL.airports).catch(() => {})
      travelLogger.info(this.name, `✅ Found ${airports.length} airports for "${keyword}"`)
      return airports
    } catch (err) {
      travelLogger.warn(this.name, `searchAirports failed for "${keyword}": ${err.message}`)
      return []
    }
  }

  // ── searchAirportsByCity ──────────────────────────────────────────────────
  // Find all airports serving a given city.

  /**
   * @param {string} city  — City name e.g. "Mumbai"
   * @param {number} [limit=10]
   * @returns {Promise<NormalisedAirport[]>}
   */
  async searchAirportsByCity(city, limit = 10) {
    if (!this.config.enabled) return []
    if (!city?.trim()) return []

    const cacheKey = `avstack:airports:city:${city.toLowerCase().trim()}:l${limit}`
    const cached   = await cacheService.getByNs('flights:airports:city', cacheKey)
    if (cached) {
      travelLogger.debug(this.name, `Airports by city cache HIT for "${city}"`)
      return cached
    }

    try {
      travelLogger.info(this.name, `Searching airports for city="${city}"`)
      const raw = await this.request('/airports', {
        city_name: city.trim(),
        limit:     Math.min(limit, 100),
      })

      const airports = adapter.normaliseAirports(raw?.data || [])
      cacheService.set('flights:airports:city', cacheKey, airports, TTL.airportsCity).catch(() => {})
      travelLogger.info(this.name, `✅ Found ${airports.length} airports in "${city}"`)
      return airports
    } catch (err) {
      travelLogger.warn(this.name, `searchAirportsByCity failed for "${city}": ${err.message}`)
      return []
    }
  }

  // ── searchFlights (schedules) ─────────────────────────────────────────────
  // Search scheduled flights between two airports on a given date.

  /**
   * @param {Object} params
   * @param {string}  params.depIata      — Departure airport IATA (e.g. "DEL")
   * @param {string}  params.arrIata      — Arrival airport IATA (e.g. "BOM")
   * @param {string}  [params.flightDate] — ISO date "YYYY-MM-DD" (defaults to today)
   * @param {number}  [params.limit=10]
   * @returns {Promise<NormalisedFlight[]>}
   */
  async searchFlights({ depIata, arrIata, flightDate, limit = 10 } = {}) {
    if (!this.config.enabled) {
      travelLogger.warn(this.name, 'Provider disabled — AVIATIONSTACK_API_KEY_1 not set')
      return []
    }
    if (!depIata || !arrIata) {
      travelLogger.warn(this.name, 'searchFlights: depIata and arrIata are required')
      return []
    }

    const date     = flightDate || new Date().toISOString().split('T')[0]
    const cacheKey = `avstack:flights:${depIata}-${arrIata}:${date}:l${limit}`
    const cached   = await cacheService.getByNs('flights:search', cacheKey)
    if (cached) {
      travelLogger.debug(this.name, `Flight search cache HIT ${depIata}→${arrIata} on ${date}`)
      return cached
    }

    travelLogger.info(this.name, `Searching flights ${depIata}→${arrIata} on ${date}`)

    try {
      // Free tier doesn't support flight_date filter. Omit it to avoid function_access_restricted error.
      const raw = await this.request('/flights', {
        dep_iata:    depIata.toUpperCase(),
        arr_iata:    arrIata.toUpperCase(),
        limit:       Math.min(limit, 100),
      })

      if (raw?.error) {
        travelLogger.error(this.name, `AviationStack API error: ${raw.error.message}`, raw.error)
        return []
      }

      let flights = adapter.normaliseFlights(raw?.data || [])

      // Filter in-memory by date if requested
      if (flightDate) {
        const filtered = flights.filter(f => f.flightDate === flightDate)
        if (filtered.length > 0) {
          flights = filtered
        }
      }

      cacheService.set('flights:search', cacheKey, flights, TTL.schedules).catch(() => {})
      travelLogger.info(this.name, `✅ Found ${flights.length} flights ${depIata}→${arrIata}`)
      return flights
    } catch (err) {
      travelLogger.warn(this.name, `searchFlights failed ${depIata}→${arrIata}: ${err.message}`)
      return []
    }
  }

  // ── getAirlines ───────────────────────────────────────────────────────────

  /**
   * Get airline details by IATA code(s).
   *
   * @param {string|string[]} codes — IATA codes e.g. "AI" or ["AI", "6E"]
   * @returns {Promise<NormalisedAirline[]>}
   */
  async getAirlines(codes) {
    if (!this.config.enabled) return []
    const codeList = Array.isArray(codes) ? codes : [codes]
    if (!codeList.length) return []

    const cacheKey = `avstack:airlines:${codeList.sort().join(',')}`
    const cached   = await cacheService.getByNs('flights:airlines', cacheKey)
    if (cached) return cached

    const results = []

    // AviationStack filters one airline at a time — batch with Promise.allSettled
    const fetches = codeList.map(async (code) => {
      try {
        const raw = await this.request('/airlines', {
          airline_iata: code.toUpperCase(),
          limit: 1,
        })
        return adapter.normaliseAirlines(raw?.data || [])
      } catch (err) {
        travelLogger.warn(this.name, `getAirlines failed for "${code}": ${err.message}`)
        return []
      }
    })

    const settled = await Promise.allSettled(fetches)
    settled.forEach(r => {
      if (r.status === 'fulfilled') results.push(...r.value)
    })

    cacheService.set('flights:airlines', cacheKey, results, TTL.airlines).catch(() => {})
    travelLogger.info(this.name, `✅ Got ${results.length} airline(s) for [${codeList.join(',')}]`)
    return results
  }

  // ── getFlightStatus ───────────────────────────────────────────────────────
  // Live status of a specific flight.

  /**
   * @param {Object} params
   * @param {string}  params.flightIata  — Full flight designator e.g. "AI302"
   * @param {string}  [params.flightDate] — ISO date "YYYY-MM-DD" (defaults to today)
   * @returns {Promise<NormalisedFlight | null>}
   */
  async getFlightStatus({ flightIata, flightDate } = {}) {
    if (!this.config.enabled) return null
    if (!flightIata?.trim()) return null

    const date     = flightDate || new Date().toISOString().split('T')[0]
    const cacheKey = `avstack:status:${flightIata.toUpperCase()}:${date}`
    const cached   = await cacheService.getByNs('flights:status', cacheKey)
    if (cached) return cached

    travelLogger.info(this.name, `Fetching status for flight ${flightIata} on ${date}`)

    try {
      const raw = await this.request('/flights', {
        flight_iata:  flightIata.toUpperCase(),
        flight_date:  date,
        limit:        1,
      })

      const flights = adapter.normaliseFlights(raw?.data || [])
      const flight  = flights[0] || null

      if (flight) {
        cacheService.set('flights:status', cacheKey, flight, TTL.status).catch(() => {})
        travelLogger.info(this.name, `✅ Status for ${flightIata}: ${flight.status}`)
      } else {
        travelLogger.warn(this.name, `No status data for flight ${flightIata} on ${date}`)
      }

      return flight
    } catch (err) {
      travelLogger.warn(this.name, `getFlightStatus failed for ${flightIata}: ${err.message}`)
      return null
    }
  }

  // ── Health ────────────────────────────────────────────────────────────────

  async healthStatus() {
    return {
      name:    this.name,
      enabled: this.config.enabled,
      circuitBreaker: await this.circuitBreaker.status(),
      keyRotator:     this.keyRotator.status(),
      tier: 'free — HTTP only, 500 req/month. Upgrade at aviationstack.com for HTTPS + real-time.',
    }
  }

  isEnabled() {
    return !!this.config.enabled
  }

  // ── BaseProvider abstract stubs ────────────────────────────────────────────
  async fetchAttractions() { return [] }
  async fetchHotels()      { return [] }
  async fetchWeather()     { return null }
}

module.exports = new AviationStackProvider()
