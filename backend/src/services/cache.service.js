// server/src/services/cache.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralised cache service used by middleware and controllers.
//
// Namespace + TTL configuration:
//
//  Namespace                TTL      Invalidated by
//  ─────────────────────────────────────────────────────────────────────────
//  destinations:trending    10 min   Trip created / deleted
//  destinations:feed        5 min    Trip created / deleted
//  hotels                   30 min   Hotel data updated (admin seeding)
//  restaurants              30 min   Restaurant data updated
//  attractions              30 min   Attraction data updated
//  search:city              15 min   Any place entity update
//  search:nearby            10 min   Any place entity update
//  itinerary                60 min   Never auto-invalidated (param-keyed)
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto')
const redis  = require('../config/redis')
const logger = require('../utils/logger')

// ── TTL Registry (seconds) ────────────────────────────────────────────────
const TTL = {
  'destinations:trending': 600,   // 10 min
  'destinations:feed':     300,   // 5 min
  'hotels':                1800,  // 30 min
  // Restaurants
  'restaurants':           1800,  // 30 min  ← generic (backward compat)
  'restaurants:city':      900,   // 15 min  ← FSQ city restaurant search
  'restaurants:nearby':    600,   // 10 min  ← FSQ nearby restaurant search
  'restaurants:detail':    2700,  // 45 min  ← FSQ full detail (hours, photos, menus)
  // Attractions
  'attractions':           1800,  // 30 min  ← generic (backward compat)
  'attractions:city':      900,   // 15 min  ← OTM city search results
  'attractions:nearby':    600,   // 10 min  ← OTM nearby search results
  'attractions:detail':    1800,  // 30 min  ← OTM full detail (with images + description)
  // Weather (OWM free tier: 60 req/min; data changes every 10–60 min)
  'weather:current':       600,   // 10 min  ← current conditions (changes quickly)
  'weather:forecast':      3600,  // 60 min  ← 5-day forecast (stable for 1h)
  // Flights (Amadeus — static airport/airline data; volatile pricing)
  'flights:airports':      86400, // 24 h    ← airport autocomplete (static IATA data)
  'flights:search':        600,   // 10 min  ← flight offers (prices shift frequently)
  'flights:airlines':      86400, // 24 h    ← airline name/details (static data)

  // Search
  'search:city':           900,   // 15 min
  'search:nearby':         600,   // 10 min
  'search:es':             300,   // 5 min  ← Elasticsearch results
  // Other
  'itinerary':             3600,  // 60 min
  'rec:similar':           1800,  // 30 min ← similar destinations
  'rec:trending':          600,   // 10 min ← trending leaderboard API
  'rec:personalized':      300,   // 5 min  ← user-specific recs
  'default':               300,   // 5 min
}



/**
 * Resolve TTL for a given namespace.
 * Supports exact match and prefix match (e.g. "destinations:feed").
 */
const resolveTTL = (namespace) =>
  TTL[namespace] ??
  Object.entries(TTL).find(([k]) => namespace.startsWith(k))?.[1] ??
  TTL.default

/**
 * Build a deterministic, short cache key from a namespace + raw string.
 * The raw string is SHA-256-hashed to avoid long/special-char keys in Redis.
 *
 * @param   {string} namespace  e.g. "hotels"
 * @param   {string} raw        e.g. full URL with query string, or JSON body
 * @returns {string}            e.g. "hotels:a3f9c2..."
 */
const buildKey = (namespace, raw) => {
  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
  return `${namespace}:${hash}`
}

/**
 * Get a value from cache.
 * Returns the parsed value or null on miss.
 */
const get = async (key) => {
  try {
    return await redis.cacheGet(key)
  } catch (err) {
    logger.warn(`[CacheService] GET failed for key "${key}": ${err.message}`)
    return null
  }
}

/**
 * Set a value in cache under the given namespace.
 * TTL is resolved automatically from the namespace registry unless overridden.
 *
 * @param {string} namespace
 * @param {string} raw        Raw string used to build the hashed key
 * @param {*}      value      Anything JSON-serialisable
 * @param {number} [ttl]      Override TTL in seconds
 * @returns {string}          The key that was set
 */
const setByNamespace = async (namespace, raw, value, ttl) => {
  const key        = buildKey(namespace, raw)
  const effectiveTTL = ttl ?? resolveTTL(namespace)
  await redis.cacheSet(key, value, effectiveTTL)
  return key
}

/**
 * Get by namespace + raw string (builds the same key as setByNamespace).
 */
const getByNamespace = async (namespace, raw) => {
  const key = buildKey(namespace, raw)
  return redis.cacheGet(key)
}

/**
 * Delete a single key.
 */
const del = async (key) => redis.cacheDel(key)

/**
 * Delete all keys matching a glob pattern.
 */
const delPattern = async (pattern) => redis.cacheDelPattern(pattern)

/**
 * Flush an entire namespace (e.g. "hotels" deletes all "hotels:*" keys).
 */
const flush = async (namespace) => {
  logger.info(`[CacheService] Flushing namespace "${namespace}"`)
  return redis.cacheFlush(namespace)
}

/**
 * Flush multiple namespaces at once.
 * Used when a write event affects several caches (e.g. new trip → feed + trending).
 */
const flushMany = async (...namespaces) => {
  await Promise.all(namespaces.map(flush))
}

/**
 * Return cache statistics from the underlying client.
 */
const getStats = () => redis.getStats()

/**
 * Reset statistics counters.
 */
const resetStats = () => redis.resetStats()

module.exports = {
  TTL,
  buildKey,
  resolveTTL,
  get,
  del,
  delPattern,
  flush,
  flushMany,
  set:          setByNamespace,
  getByNs:      getByNamespace,
  getStats,
  resetStats,
}
