// backend/src/services/travel/providers/BaseProvider.js
// ─────────────────────────────────────────────────────────────────────────────
// Abstract base class for all travel API providers.
//
// Provides transparently:
//   ✅ Retry with exponential backoff + jitter
//   ✅ Per-provider rate limiting (token-bucket / sliding-window / daily-counter)
//   ✅ Circuit breaker (CLOSED / OPEN / HALF_OPEN)
//   ✅ API key rotation + suspension on 401/403
//   ✅ Cache-aside via cache.service.js
//   ✅ Structured logging via travelLogger.js
//
// Subclasses MUST implement:
//   fetchAttractions(params)  → Promise<NormalisedAttraction[]>
//   fetchHotels(params)       → Promise<NormalisedHotel[]>
//   fetchWeather(params)      → Promise<NormalisedWeather>
//
// Subclasses call this.request(url, options) for all HTTP calls.
// ─────────────────────────────────────────────────────────────────────────────
const https = require('https')
const http  = require('http')
const { URL } = require('url')
const { retryWithBackoff, HttpError } = require('../utils/retryWithBackoff')
const RateLimiter   = require('../middleware/rateLimiter')
const { CircuitBreaker } = require('../middleware/circuitBreaker')
const ApiKeyRotator = require('../utils/apiKeyRotator')
const travelLogger  = require('../utils/travelLogger')
const cacheService  = require('../../cache.service')

class BaseProvider {
  /**
   * @param {Object} providerConfig — from travelProviders.config.js
   */
  constructor(providerConfig) {
    this.config      = providerConfig
    this.name        = providerConfig.name
    this.baseUrl     = providerConfig.baseUrl
    this.timeout     = providerConfig.timeout || 5000
    this.maxRetries  = providerConfig.maxRetries || 4

    this.rateLimiter    = new RateLimiter(this.name, providerConfig.rateLimit)
    this.circuitBreaker = new CircuitBreaker(this.name)
    this.keyRotator     = new ApiKeyRotator(this.name, providerConfig.keys || [])
  }

  // ── Abstract Methods (must override) ──────────────────────────────────────

  async fetchAttractions(params) { throw new Error(`${this.name}: fetchAttractions() not implemented`) }
  async fetchHotels(params)      { throw new Error(`${this.name}: fetchHotels() not implemented`) }
  async fetchWeather(params)     { throw new Error(`${this.name}: fetchWeather() not implemented`) }

  // ── Core HTTP Method ─────────────────────────────────────────────────────

  /**
   * Make an HTTP GET request with full resilience stack:
   * circuit breaker → rate limiter → retry → key rotation.
   *
   * @param {string} path     — e.g. '/places/radius'
   * @param {Object} params   — Query string parameters (key-value pairs)
   * @param {Object} headers  — Additional request headers
   * @returns {Promise<Object>} — Parsed JSON response
   */
  async request(path, params = {}, headers = {}) {
    // 0. API keys check (skip if all keys are suspended)
    if (this.keyRotator.keys.length > 0 && !this.keyRotator.hasAvailableKeys()) {
      travelLogger.warn(this.name, `All API keys are suspended — skipping request`, { path })
      throw new Error(`${this.name}: All API keys are suspended`)
    }

    // 1. Circuit Breaker check
    const { allowed, state } = await this.circuitBreaker.canRequest()
    if (!allowed) {
      travelLogger.warn(this.name, `Circuit breaker OPEN — request blocked`, { state, path })
      const err = new Error(`${this.name} circuit breaker is OPEN`)
      err.isCircuitOpen = true
      throw err
    }

    // 2. Rate limiter check (wait up to 500ms for a slot)
    const ratePassed = await this.rateLimiter.waitForSlot(500)
    if (!ratePassed) {
      const err = new Error(`${this.name} rate limit exceeded — slot wait too long`)
      err.isRateLimited = true
      throw err
    }

    // 3. Execute with retry + key rotation
    const startMs = Date.now()

    try {
      const result = await retryWithBackoff(
        async (attempt) => {
          const key = this.keyRotator.next()
          return this._doRequest(path, params, headers, key)
        },
        {
          maxRetries: this.maxRetries,
          providerName: this.name,
          operation: `GET ${path}`,
        }
      )

      await this.circuitBreaker.recordSuccess()

      travelLogger.info(this.name, `✅ ${path}`, {
        latencyMs: Date.now() - startMs,
        params: Object.keys(params),
      })

      return result
    } catch (err) {
      await this.circuitBreaker.recordFailure(err)
      throw err
    }
  }

  /**
   * Internal: execute a single HTTP request.
   * Handles 401/403 by suspending the key used.
   */
  _doRequest(path, params, headers, apiKey) {
    return new Promise((resolve, reject) => {
      const urlStr = `${this.baseUrl}${path}`
      const url    = new URL(urlStr)

      // Append query params
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v))
        }
      })

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TripSetGo/1.0',
          ...headers,
        },
        timeout: this.timeout,
      }

      const protocol = url.protocol === 'https:' ? https : http
      const req = protocol.request(options, (res) => {
        let body = ''
        res.on('data', chunk => { body += chunk })
        res.on('end', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            if (apiKey) this.keyRotator.suspend(apiKey)
            return reject(new HttpError(`Auth failed (${res.statusCode})`, res.statusCode))
          }

          if (res.statusCode >= 400) {
            return reject(new HttpError(
              `HTTP ${res.statusCode}: ${body.slice(0, 200)}`,
              res.statusCode
            ))
          }

          try {
            resolve(JSON.parse(body))
          } catch (parseErr) {
            reject(new Error(`${this.name}: Failed to parse JSON response: ${parseErr.message}`))
          }
        })
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`${this.name}: Request timed out after ${this.timeout}ms`))
      })

      req.on('error', (err) => {
        reject(new Error(`${this.name}: Network error: ${err.message}`))
      })

      req.end()
    })
  }

  // ── Cache-Aside Helper ────────────────────────────────────────────────────

  /**
   * Fetch from cache first; on MISS, run `fetchFn`, cache the result, return it.
   *
   * @param {string}   namespace  — Cache namespace (e.g. 'travel:attractions')
   * @param {string}   raw        — Raw cache key discriminator (hashed internally)
   * @param {Function} fetchFn    — Async function that calls the external API
   * @returns {Promise<*>}
   */
  async fetchWithCache(namespace, raw, fetchFn) {
    const cached = await cacheService.getByNs(namespace, raw, fetchFn)
    if (cached !== null) {
      travelLogger.cache(this.name, 'HIT', namespace, { raw: raw.slice(0, 40) })
      return cached
    }

    travelLogger.cache(this.name, 'MISS', namespace, { raw: raw.slice(0, 40) })
    const data = await fetchFn()

    // Fire-and-forget cache write — don't let a cache error fail the request
    cacheService.set(namespace, raw, data).catch(err => {
      travelLogger.warn(this.name, `Cache SET failed for ${namespace}: ${err.message}`)
    })

    travelLogger.cache(this.name, 'SET', namespace)
    return data
  }

  /**
   * Health status of this provider (for monitoring endpoint).
   */
  async healthStatus() {
    return {
      name: this.name,
      enabled: this.config.enabled,
      circuitBreaker: await this.circuitBreaker.status(),
      keyRotator: this.keyRotator.status(),
    }
  }
}

module.exports = BaseProvider
