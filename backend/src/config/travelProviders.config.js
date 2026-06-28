// backend/src/config/travelProviders.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all external travel API providers.
// Credentials are read from environment variables at startup.
// Rate-limit profiles are used by rateLimiter.js and BaseProvider.js.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provider configuration schema:
 * {
 *   name          : string   — human-readable name (used in logs + cache keys)
 *   baseUrl       : string   — base HTTP URL (no trailing slash)
 *   timeout       : number   — per-request timeout in ms
 *   maxRetries    : number   — max retry attempts before giving up
 *   rateLimit     : {
 *     strategy    : 'token-bucket' | 'sliding-window' | 'daily-counter'
 *     maxRequests : number   — max calls allowed per window
 *     windowMs    : number   — window size in milliseconds
 *   }
 *   keys          : string[] — API key(s) from env; rotated round-robin
 *   enabled       : boolean  — set false to skip this provider entirely
 * }
 */

const cfg = {
  overpass: {
    name: 'Overpass',
    baseUrl: 'https://overpass-api.de',
    timeout: 25000,
    maxRetries: 2,
    rateLimit: {
      strategy: 'token-bucket',
      maxRequests: 2,
      windowMs: 1000,
    },
    keys: [],
    enabled: true,
  },

  foursquare: {
    name: 'Foursquare',
    baseUrl: 'https://api.foursquare.com/v3',
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 5000,
    maxRetries: parseInt(process.env.TRAVEL_API_MAX_RETRIES, 10) || 4,
    rateLimit: {
      strategy: 'daily-counter',
      maxRequests: 900,   // stay under 950/day free ceiling with a safety margin
      windowMs: 86400000, // 24 hours
    },
    keys: [
      process.env.FOURSQUARE_API_KEY_1,
      process.env.FOURSQUARE_API_KEY_2,
    ].filter(Boolean),
    enabled: !!process.env.FOURSQUARE_API_KEY_1,
  },

  openWeather: {
    name: 'OpenWeather',
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 5000,
    maxRetries: parseInt(process.env.TRAVEL_API_MAX_RETRIES, 10) || 4,
    rateLimit: {
      strategy: 'sliding-window',
      maxRequests: 55,    // stay under 60/min free tier
      windowMs: 60000,
    },
    keys: [
      process.env.OPENWEATHER_API_KEY_1,
      process.env.OPENWEATHER_API_KEY_2,
    ].filter(Boolean),
    enabled: !!process.env.OPENWEATHER_API_KEY_1,
  },

  // ── AviationStack ────────────────────────────────────────────────────────────
  // Flights, airports, airlines, flight status.
  // Free tier: 500 req/month (HTTP only) — https://aviationstack.com
  // Paid tiers unlock HTTPS and real-time data.
  // Register at: https://aviationstack.com/signup/free
  aviationStack: {
    name: 'AviationStack',
    baseUrl: 'http://api.aviationstack.com/v1', // HTTP on free tier
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 8000,
    maxRetries: parseInt(process.env.TRAVEL_API_MAX_RETRIES, 10) || 3,
    rateLimit: {
      // Monthly quota — 500/month free. Use daily-counter (≈16/day safe budget).
      // We set it generously; aggressive Redis caching is the real guard.
      strategy: 'daily-counter',
      maxRequests: 30,    // ~30/day = ~900/month — leaves buffer for spikes
      windowMs: 86400000, // 24 hours
    },
    keys: [
      process.env.AVIATIONSTACK_API_KEY_1,
      process.env.AVIATIONSTACK_API_KEY_2,
    ].filter(Boolean),
    enabled: !!process.env.AVIATIONSTACK_API_KEY_1,
  },

  nominatim: {
    name: 'Nominatim',
    baseUrl: 'https://nominatim.openstreetmap.org',
    timeout: 4000,
    maxRetries: 2,
    rateLimit: {
      strategy: 'token-bucket',
      maxRequests: 1,
      windowMs: 1000,
    },
    keys: [],
    enabled: true,
  },

  // ── OpenTripMap ──────────────────────────────────────────────────────────────
  // Attractions discovery provider: city search, nearby search, detail fetch.
  // Free tier: ~5 req/s, 5000 req/day
  // Docs: https://opentripmap.io/docs
  openTripMap: {
    name: 'OpenTripMap',
    baseUrl: 'https://api.opentripmap.com/0.1/en/places',
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 8000,
    maxRetries: parseInt(process.env.TRAVEL_API_MAX_RETRIES, 10) || 3,
    rateLimit: {
      strategy: 'token-bucket',
      maxRequests: 5,
      windowMs: 1000,
    },
    keys: [
      process.env.OPENTRIPMAP_API_KEY,
      process.env.OPENTRIPMAP_API_KEY_2,
    ].filter(Boolean),
    enabled: !!process.env.OPENTRIPMAP_API_KEY,
  },
}

// ── Validation at startup ──────────────────────────────────────────────────
const logger = require('../utils/logger')

Object.entries(cfg).forEach(([id, provider]) => {
  if (provider.enabled) {
    logger.info(`[TravelProviders] ✅ ${provider.name} — enabled`)
  } else {
    logger.warn(`[TravelProviders] ⚠️  ${provider.name} — DISABLED (missing API key)`)
  }
})

module.exports = cfg
