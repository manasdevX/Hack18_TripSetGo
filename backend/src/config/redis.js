// server/src/config/redis.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified Redis client with node-cache fallback.
// Provides:
//   - Full cache helpers: get, set, del, delPattern, flush
//   - JWT blacklisting: blacklistToken, isTokenBlacklisted
//   - Stats: getStats(), resetStats()
// ─────────────────────────────────────────────────────────────────────────────
const NodeCache = require('node-cache')
const logger    = require('../utils/logger')

// ── In-Memory Fallback (L1) ───────────────────────────────────────────────
const localCache = new NodeCache({ stdTTL: 600, checkperiod: 120 })

// ── State ─────────────────────────────────────────────────────────────────
let redisClient      = null
let useMemoryFallback = true

const stats = { hits: 0, misses: 0, errors: 0, sets: 0, deletes: 0 }

// ── Connect to Redis ──────────────────────────────────────────────────────
const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.info('ℹ️  REDIS_URL not set — using in-memory cache (node-cache)')
    return
  }

  try {
    const Redis = require('ioredis')

    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout:       5000,
      lazyConnect:          true,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('⚠️  Redis retry limit reached — switching to in-memory cache')
          return null // stop retrying
        }
        return Math.min(times * 200, 2000)
      },
    })

    await redisClient.connect()

    // Expose raw ioredis client globally so recommendation service
    // can use ZADD / ZREVRANGE / ZREMRANGEBYRANK directly
    global.__redisClient = redisClient

    redisClient.on('ready', () => {
      logger.info('🚀 Connected to Redis Cloud (AWS) successfully')
      useMemoryFallback = false
    })

    redisClient.on('error', (err) => {
      logger.warn(`⚠️  Redis error — falling back to in-memory cache: ${err.message}`)
      useMemoryFallback = true
    })

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...')
    })

    redisClient.on('close', () => {
      logger.warn('⚠️  Redis connection closed — using in-memory cache')
      useMemoryFallback = true
    })

    // NOTE: useMemoryFallback is set to false only inside the 'ready' handler above.
    // Do NOT set it here — lazyConnect means the connection hasn't been verified yet.
  } catch (err) {
    logger.warn(`⚠️  Redis init failed — using in-memory cache: ${err.message}`)
    useMemoryFallback = true
    redisClient = null
  }
}

// ── Core Cache Helpers ────────────────────────────────────────────────────

/**
 * Get a cached value by key.
 * Returns parsed object or null.
 */
const cacheGet = async (key) => {
  // Try Redis first
  if (!useMemoryFallback && redisClient) {
    try {
      const raw = await redisClient.get(key)
      if (raw !== null) {
        stats.hits++
        return JSON.parse(raw)
      }
    } catch (err) {
      stats.errors++
      logger.warn(`Redis GET error for "${key}": ${err.message}`)
    }
  }

  // Fallback to node-cache (L1)
  const local = localCache.get(key)
  if (local !== undefined) {
    stats.hits++
    return local
  }

  stats.misses++
  return null
}

/**
 * Set a value in cache.
 * @param {string} key
 * @param {*}      value   - Will be JSON-serialised for Redis
 * @param {number} ttl     - Seconds (default from env or 300)
 */
const cacheSet = async (key, value, ttl) => {
  const effectiveTTL = ttl || parseInt(process.env.REDIS_CACHE_TTL_DEFAULT, 10) || 300

  // Always write to L1 in-memory (keeps hot data fast even when Redis is live)
  localCache.set(key, value, effectiveTTL)

  if (!useMemoryFallback && redisClient) {
    try {
      await redisClient.setex(key, effectiveTTL, JSON.stringify(value))
      stats.sets++
    } catch (err) {
      stats.errors++
      logger.warn(`Redis SET error for "${key}": ${err.message}`)
    }
  } else {
    stats.sets++
  }
}

/**
 * Delete a single cache key.
 */
const cacheDel = async (key) => {
  localCache.del(key)
  if (!useMemoryFallback && redisClient) {
    try {
      await redisClient.del(key)
      stats.deletes++
    } catch (err) {
      stats.errors++
      logger.warn(`Redis DEL error for "${key}": ${err.message}`)
    }
  } else {
    stats.deletes++
  }
}

/**
 * Delete all Redis keys matching a glob pattern (e.g. "hotels:*").
 * In fallback mode, iterates node-cache keys and deletes matching ones.
 */
const cacheDelPattern = async (pattern) => {
  // node-cache fallback: manually iterate keys
  const localKeys = localCache.keys().filter((k) => {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
    return regex.test(k)
  })
  if (localKeys.length) localCache.del(localKeys)

  if (!useMemoryFallback && redisClient) {
    try {
      // Use SCAN to safely iterate — avoids blocking with KEYS in production
      let cursor = '0'
      const toDelete = []
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor
        toDelete.push(...keys)
      } while (cursor !== '0')

      if (toDelete.length) {
        await redisClient.del(...toDelete)
        stats.deletes += toDelete.length
      }
    } catch (err) {
      stats.errors++
      logger.warn(`Redis DEL pattern error for "${pattern}": ${err.message}`)
    }
  }
}

/**
 * Flush all keys under a given namespace prefix (e.g. "hotels").
 */
const cacheFlush = (namespace) => cacheDelPattern(`${namespace}:*`)

/**
 * Return current cache statistics.
 */
const getStats = () => ({
  ...stats,
  backend: useMemoryFallback ? 'node-cache (in-memory)' : 'Redis Cloud',
  redisReady: !useMemoryFallback,
})

/**
 * Reset hit/miss/error counters.
 */
const resetStats = () => {
  stats.hits = stats.misses = stats.errors = stats.sets = stats.deletes = 0
}

// ── JWT Blacklist Helpers ─────────────────────────────────────────────────
// Preserved from original implementation

const blacklistToken = async (jti, expireSeconds) => {
  const key = `blacklist:${jti}`
  if (useMemoryFallback || !redisClient) {
    localCache.set(key, true, expireSeconds)
  } else {
    try {
      await redisClient.setex(key, expireSeconds, 'true')
    } catch (err) {
      localCache.set(key, true, expireSeconds)
    }
  }
}

const isTokenBlacklisted = async (jti) => {
  const key = `blacklist:${jti}`
  if (useMemoryFallback || !redisClient) {
    return !!localCache.get(key)
  }
  try {
    const val = await redisClient.get(key)
    return val === 'true'
  } catch (err) {
    return !!localCache.get(key)
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
connectRedis()

module.exports = {
  // Cache helpers
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheFlush,
  getStats,
  resetStats,
  // JWT helpers
  blacklistToken,
  isTokenBlacklisted,
}
