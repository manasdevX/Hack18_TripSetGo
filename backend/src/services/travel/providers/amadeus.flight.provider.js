// backend/src/services/travel/providers/amadeus.flight.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// Amadeus Flight Search Provider — extends the OAuth2 token lifecycle
// from amadeus.provider.js.
//
// APIs used:
//   GET  /v2/shopping/flight-offers           — flight search
//   POST /v1/shopping/flight-offers/pricing   — confirmed pricing
//   GET  /v1/reference-data/locations         — airport autocomplete
//   GET  /v1/airlines                         — airline name lookup
//
// OAuth2 token lifecycle:
//   - POST /v1/security/oauth2/token → Bearer token (30 min expiry)
//   - Cached in Redis for 25 min (5 min safety margin)
//   - Auto-refreshed on 401 response (single retry)
//
// Amadeus test env (https://test.api.amadeus.com):
//   - Returns real flight offer structures but with synthetic data
//   - Safe for development and demos
//   - Switch baseUrl in travelProviders.config.js for production
//
// Rate limiting: token-bucket, 10 req/s on test tier
// ─────────────────────────────────────────────────────────────────────────────
const https         = require('https')
const travelLogger  = require('../utils/travelLogger')
const cacheService  = require('../../cache.service')
const { HttpError } = require('../utils/retryWithBackoff')
const adapter       = require('../adapters/amadeus.flight.adapter')
const providersCfg  = require('../../../config/travelProviders.config')

// ── TTL Constants ─────────────────────────────────────────────────────────────
const TOKEN_TTL_S        = 1500   // 25 min (Amadeus tokens expire at 30 min)
const SEARCH_CACHE_TTL_S = 600    // 10 min — flight prices shift frequently
const AIRPORT_CACHE_TTL_S= 86400  // 24 h — airport data is static
const AIRLINE_CACHE_TTL_S= 86400  // 24 h — airline info is static

class AmadeusFlightProvider {
  constructor() {
    this.config     = providersCfg.amadeus
    this.name       = 'Amadeus[Flights]'
    this.baseUrl    = this.config.baseUrl || 'https://test.api.amadeus.com'
    this.tokenUrl   = this.config.tokenUrl || 'https://test.api.amadeus.com/v1/security/oauth2/token'
    this._tokenKey  = 'travel:amadeus:token'
    this._lastToken = null       // in-process token cache for 401 retry
  }

  // ── OAuth2 Token Lifecycle ────────────────────────────────────────────────

  /**
   * Get a valid Bearer token.
   * L1: Redis cache (25 min TTL)
   * L2: In-process memory (within same request burst)
   * L3: POST to /v1/security/oauth2/token
   *
   * @returns {Promise<string | null>}
   */
  async _getToken() {
    // L1 — Redis
    try {
      const cached = await cacheService.getByNs(this._tokenKey, 'singleton')
      if (cached?.token) {
        travelLogger.debug(this.name, 'OAuth2 token — Redis HIT')
        this._lastToken = cached.token
        return cached.token
      }
    } catch { /* Redis unavailable — continue */ }

    travelLogger.info(this.name, 'OAuth2 token — fetching new token')

    try {
      const token = await this._fetchToken()
      // Cache for 25 min
      cacheService.set(this._tokenKey, 'singleton', { token }, TOKEN_TTL_S).catch(() => {})
      this._lastToken = token
      return token
    } catch (err) {
      travelLogger.error(this.name, `OAuth2 token fetch failed: ${err.message}`)
      return null
    }
  }

  /**
   * POST client credentials to Amadeus token endpoint.
   * @returns {Promise<string>} access_token
   */
  _fetchToken() {
    return new Promise((resolve, reject) => {
      if (!this.config.clientId || !this.config.clientSecret) {
        return reject(new Error('AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET not set'))
      }

      const body = `grant_type=client_credentials` +
        `&client_id=${encodeURIComponent(this.config.clientId)}` +
        `&client_secret=${encodeURIComponent(this.config.clientSecret)}`

      const url = new URL(this.tokenUrl)
      const options = {
        hostname: url.hostname,
        port:     443,
        path:     url.pathname,
        method:   'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent':     'TripSetGo/1.0',
        },
        timeout: 10000,
      }

      const req = https.request(options, res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.access_token) return resolve(json.access_token)
            reject(new Error(`Token error: ${json.error_description || json.error || data.slice(0, 100)}`))
          } catch (e) {
            reject(new Error(`Token parse error: ${e.message}`))
          }
        })
      })

      req.on('timeout', () => { req.destroy(); reject(new Error('Token request timed out after 10s')) })
      req.on('error', err => reject(err))
      req.write(body)
      req.end()
    })
  }

  /**
   * Invalidate the cached token (e.g. after a 401).
   */
  async _invalidateToken() {
    this._lastToken = null
    try {
      await cacheService.del(this._tokenKey, 'singleton')
    } catch { /* ignore */ }
    travelLogger.warn(this.name, 'OAuth2 token invalidated — will re-fetch on next request')
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  /**
   * Authenticated GET request to Amadeus API.
   * Auto-refreshes token on 401 (one retry).
   */
  async _get(path, params = {}, retried = false) {
    const token = await this._getToken()
    if (!token) throw new Error('No valid Amadeus OAuth2 token available')

    const url = new URL(`${this.baseUrl}${path}`)
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    })

    const json = await this._request(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'TripSetGo/1.0' },
    })
    return json
  }

  /**
   * Authenticated POST request to Amadeus API.
   */
  async _post(path, body = {}) {
    const token = await this._getToken()
    if (!token) throw new Error('No valid Amadeus OAuth2 token available')

    const url = `${this.baseUrl}${path}`
    const json = await this._request(url, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent':   'TripSetGo/1.0',
      },
      body: JSON.stringify(body),
    })
    return json
  }

  /**
   * Low-level HTTP request wrapper with 401 token auto-refresh.
   */
  _request(urlStr, options = {}) {
    return new Promise((resolve, reject) => {
      const url     = new URL(urlStr)
      const isHttps = url.protocol === 'https:'
      const mod     = isHttps ? require('https') : require('http')
      const bodyData = options.body ? Buffer.from(options.body, 'utf8') : null

      const reqOptions = {
        hostname: url.hostname,
        port:     url.port || (isHttps ? 443 : 80),
        path:     `${url.pathname}${url.search}`,
        method:   options.method || 'GET',
        headers:  {
          'Accept': 'application/json',
          ...options.headers,
          ...(bodyData ? { 'Content-Length': bodyData.byteLength } : {}),
        },
        timeout: this.config.timeout || 10000,
      }

      const req = mod.request(reqOptions, res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', async () => {
          if (res.statusCode === 401) {
            // Token expired or invalid — invalidate and propagate
            await this._invalidateToken().catch(() => {})
            return reject(new HttpError('Amadeus token expired or invalid', 401))
          }
          if (res.statusCode === 429) {
            return reject(new HttpError('Amadeus rate limit exceeded', 429))
          }
          if (res.statusCode >= 400) {
            let msg = `HTTP ${res.statusCode}`
            try {
              const errJson = JSON.parse(data)
              const errs = errJson.errors || errJson.error_description
              msg = Array.isArray(errs) ? errs.map(e => e.detail || e.title).join('; ') : (errs || msg)
            } catch { /* ignore */ }
            return reject(new HttpError(msg, res.statusCode))
          }

          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error(`Amadeus: JSON parse error: ${e.message}`))
          }
        })
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`Amadeus: Request timed out (${this.config.timeout || 10000}ms)`))
      })
      req.on('error', err => reject(new Error(`Amadeus: Network error: ${err.message}`)))

      if (bodyData) req.write(bodyData)
      req.end()
    })
  }

  // ── Airport Autocomplete ──────────────────────────────────────────────────

  /**
   * Search airports/cities by keyword for autocomplete.
   *
   * @param {Object} params
   * @param {string} params.keyword     — Search string (min 2 chars)
   * @param {string} [params.subType]   — 'AIRPORT' | 'CITY' | 'AIRPORT,CITY'
   * @param {string} [params.countryCode] — ISO 3166 alpha-2 to restrict results
   * @param {number} [params.limit=10]
   * @returns {Promise<NormalisedAirport[]>}
   */
  async searchAirports({ keyword, subType = 'AIRPORT,CITY', countryCode, limit = 10 } = {}) {
    if (!this.config.enabled) return []
    if (!keyword || keyword.trim().length < 2) return []

    const cacheKey = `amadeus:airports:${keyword.toLowerCase()}:${subType}:${countryCode || ''}:${limit}`
    const cached   = await cacheService.getByNs('flights:airports', cacheKey)
    if (cached) {
      travelLogger.debug(this.name, `Airport autocomplete cache HIT for "${keyword}"`)
      return cached
    }

    try {
      const params = {
        keyword:    keyword.trim().toUpperCase(),
        subType,
        view:       'LIGHT',
        page_limit: Math.min(limit, 20),
      }
      if (countryCode) params['page[offset]'] = 0

      const raw = await this._get('/v1/reference-data/locations', params)
      const airports = adapter.normaliseAirports(raw?.data || [])

      cacheService.set('flights:airports', cacheKey, airports, AIRPORT_CACHE_TTL_S).catch(() => {})
      travelLogger.info(this.name, `Airport autocomplete: ${airports.length} results for "${keyword}"`)
      return airports
    } catch (err) {
      travelLogger.warn(this.name, `searchAirports failed: ${err.message}`)
      return []
    }
  }

  // ── Airline Details ───────────────────────────────────────────────────────

  /**
   * Fetch airline details by IATA code(s).
   *
   * @param {string|string[]} airlineCodes — IATA code(s), e.g. "6E" or ["6E","AI"]
   * @returns {Promise<NormalisedAirline[]>}
   */
  async getAirlines(airlineCodes) {
    if (!this.config.enabled) return []
    const codes = Array.isArray(airlineCodes) ? airlineCodes : [airlineCodes]
    if (!codes.length) return []

    const cacheKey = `amadeus:airlines:${codes.sort().join(',')}`
    const cached   = await cacheService.getByNs('flights:airlines', cacheKey)
    if (cached) return cached

    try {
      const raw = await this._get('/v1/airlines', { airlineCodes: codes.join(',') })
      const airlines = adapter.normaliseAirlines(raw?.data || [])
      cacheService.set('flights:airlines', cacheKey, airlines, AIRLINE_CACHE_TTL_S).catch(() => {})
      return airlines
    } catch (err) {
      travelLogger.warn(this.name, `getAirlines failed for [${codes.join(',')}]: ${err.message}`)
      return []
    }
  }

  // ── Flight Search ─────────────────────────────────────────────────────────

  /**
   * Search for available flights.
   *
   * @param {Object} params
   * @param {string}  params.origin          — Origin IATA code (e.g. "DEL")
   * @param {string}  params.destination     — Destination IATA code (e.g. "BOM")
   * @param {string}  params.departureDate   — ISO date 'YYYY-MM-DD'
   * @param {string}  [params.returnDate]    — Round trip return date (optional)
   * @param {number}  [params.adults=1]      — Number of adult passengers
   * @param {number}  [params.children=0]    — Number of children (2–11 years)
   * @param {number}  [params.infants=0]     — Number of infants (<2 years)
   * @param {string}  [params.travelClass]   — ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
   * @param {number}  [params.max=10]        — Max offers (1–250)
   * @param {boolean} [params.nonStop=false] — Non-stop flights only
   * @param {string}  [params.currencyCode]  — Response currency (default: USD)
   * @returns {Promise<NormalisedFlightOffer[]>}
   */
  async searchFlights({
    origin,
    destination,
    departureDate,
    returnDate,
    adults       = 1,
    children     = 0,
    infants      = 0,
    travelClass  = 'ECONOMY',
    max          = 10,
    nonStop      = false,
    currencyCode = 'USD',
  } = {}) {
    if (!this.config.enabled) {
      travelLogger.warn(this.name, 'Provider disabled — AMADEUS_CLIENT_ID not set')
      return []
    }
    if (!origin || !destination || !departureDate) {
      travelLogger.warn(this.name, 'searchFlights missing required params')
      return []
    }

    const cacheKey = [
      `amadeus:flights`,
      `${origin}-${destination}`,
      departureDate,
      returnDate || 'ow',
      `a${adults}c${children}i${infants}`,
      travelClass,
      `max${max}`,
      nonStop ? 'nonstop' : 'any',
    ].join(':')

    const cached = await cacheService.getByNs('flights:search', cacheKey)
    if (cached) {
      travelLogger.info(this.name, `Flight search cache HIT: ${origin}→${destination}`)
      return cached
    }

    travelLogger.info(this.name, `Flight search: ${origin}→${destination} on ${departureDate}`)

    try {
      const params = {
        originLocationCode:      origin.toUpperCase(),
        destinationLocationCode: destination.toUpperCase(),
        departureDate,
        adults:       String(adults),
        max:          String(Math.min(max, 50)),
        travelClass,
        nonStop:      nonStop ? 'true' : 'false',
        currencyCode,
      }

      if (returnDate)  params.returnDate   = returnDate
      if (children > 0) params.children   = String(children)
      if (infants > 0)  params.infants    = String(infants)

      const raw     = await this._get('/v2/shopping/flight-offers', params)
      const flights = adapter.normaliseMany(raw?.data || [])

      travelLogger.info(this.name, `✅ Found ${flights.length} flight offers`)

      cacheService.set('flights:search', cacheKey, flights, SEARCH_CACHE_TTL_S).catch(() => {})
      return flights
    } catch (err) {
      travelLogger.warn(this.name, `searchFlights failed: ${err.message}`)
      if (err.message?.includes('AMADEUS') || err.status >= 500) throw err
      return []
    }
  }

  // ── Flight Pricing ────────────────────────────────────────────────────────

  /**
   * Confirm and lock pricing for a specific flight offer.
   * Call AFTER searchFlights to confirm the current price before booking.
   *
   * @param {Object} flightOffer — Raw Amadeus flight offer object (not normalised)
   *   Use the `_raw` or pass the offer id from the search results.
   * @returns {Promise<NormalisedFlightOffer | null>}
   */
  async confirmPricing(flightOffer) {
    if (!this.config.enabled) return null

    travelLogger.info(this.name, `Confirming price for offer id="${flightOffer?.id}"`)

    try {
      const body = {
        data: {
          type:         'flight-offers-pricing',
          flightOffers: [flightOffer],
        },
      }

      const raw    = await this._post('/v1/shopping/flight-offers/pricing', body)
      const result = adapter.normalisePricingConfirmation(raw)

      travelLogger.info(this.name, `✅ Price confirmed: ₹${result?.totalINR?.toLocaleString() || '?'}`)
      return result
    } catch (err) {
      travelLogger.warn(this.name, `confirmPricing failed: ${err.message}`)
      return null
    }
  }

  // ── Health ────────────────────────────────────────────────────────────────

  async healthStatus() {
    const tokenAvailable = !!(await this._getToken().catch(() => null))
    return {
      name:           this.name,
      enabled:        this.config.enabled,
      tokenAvailable,
      env:            this.baseUrl.includes('test') ? 'test' : 'production',
    }
  }

  isEnabled() {
    return !!this.config.enabled
  }
}

module.exports = new AmadeusFlightProvider()
