// server/src/middleware/cache.middleware.js
const NodeCache = require('node-cache')
const logger = require('../utils/logger')

// Standard TTL is 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 })

/**
 * Caching middleware that checks if a response exists for the given URL.
 * If it does, serves from cache. If not, patches res.json to store the response before sending.
 */
const cacheMiddleware = (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next()
  }

  // The key is the exact URL with query params
  const key = req.originalUrl
  const cachedResponse = cache.get(key)

  if (cachedResponse) {
    logger.info(`Cache HIT for ${key}`)
    return res.status(200).json(cachedResponse)
  }

  logger.info(`Cache MISS for ${key}`)

  // Overwrite res.json to cache the body before sending
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
      cache.set(key, body)
    }
    return originalJson(body)
  }

  next()
}

module.exports = cacheMiddleware
