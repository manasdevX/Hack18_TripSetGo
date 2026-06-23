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
    // Primary Overpass endpoint (OSM public instance)
    // Mirror is handled inside overpass.provider.js automatically
    baseUrl: 'https://overpass-api.de',
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 25000, // Overpass may be slow
    maxRetries: 2,  // Fewer retries — Overpass queries are expensive
    rateLimit: {
      strategy: 'token-bucket',
      maxRequests: 2,   // Max 2 req/s (OSM fair-use policy)
      windowMs: 1000,
    },
    keys: [], // No API key required for Overpass
    enabled: true, // Always enabled
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

  amadeus: {
    name: 'Amadeus',
    // Test environment — switch to 'https://api.amadeus.com' for production
    baseUrl: 'https://test.api.amadeus.com',
    tokenUrl: 'https://test.api.amadeus.com/v1/security/oauth2/token',
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 8000,
    maxRetries: parseInt(process.env.TRAVEL_API_MAX_RETRIES, 10) || 4,
    rateLimit: {
      strategy: 'token-bucket',
      maxRequests: 10,   // 10 req/s on test tier
      windowMs: 1000,
    },
    // Amadeus uses OAuth2 client credentials — not a simple API key
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    // keys array is unused for Amadeus (OAuth2 flow), kept empty for BaseProvider compat
    // Amadeus is disabled/removed for now per user request
    enabled: false,
  },

  nominatim: {
    name: 'Nominatim',
    baseUrl: 'https://nominatim.openstreetmap.org',
    timeout: 4000,
    maxRetries: 2,
    rateLimit: {
      // Nominatim usage policy: max 1 req/s
      strategy: 'token-bucket',
      maxRequests: 1,
      windowMs: 1000,
    },
    keys: [], // no key required
    enabled: true,
  },

  // ── OpenTripMap ─────────────────────────────────────────────────────────
  // Attractions discovery provider: city search, nearby search, detail fetch.
  // Free tier: ~5 req/s, 5000 req/day
  // Docs: https://opentripmap.io/docs
  // Get a free key at: https://opentripmap.io/product
  openTripMap: {
    name: 'OpenTripMap',
    baseUrl: 'https://api.opentripmap.com/0.1/en/places',
    timeout: parseInt(process.env.TRAVEL_API_TIMEOUT_MS, 10) || 8000,
    maxRetries: parseInt(process.env.TRAVEL_API_MAX_RETRIES, 10) || 3,
    rateLimit: {
      strategy: 'token-bucket',
      maxRequests: 5,    // Stay under free-tier 5 req/s
      windowMs: 1000,
    },
    keys: [
      process.env.OPENTRIPMAP_API_KEY,
      process.env.OPENTRIPMAP_API_KEY_2, // optional second key for rotation
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
