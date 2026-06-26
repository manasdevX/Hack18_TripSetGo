// backend/src/services/weather.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Weather Intelligence Service — high-level business logic layer.
//
// Orchestrates:
//   1. Redis cache lookup (L1 — 10min current, 60min forecast)
//   2. MongoDB cache lookup (L2 — TTL-indexed)
//   3. OpenWeatherMap API fetch (via openweather.provider.js)
//   4. Travel suitability scoring + packing list computation (in adapter)
//   5. Fire-and-forget MongoDB persistence
//
// Public API:
//   getCurrentWeather(params)          → NormalisedWeather (current only)
//   getForecast(params)                → NormalisedWeatherForecast[]
//   getWeatherIntelligence(params)     → full combined payload
//   getTravelSuitability(params)       → travelScore + label + breakdown
//   getPackingRecommendations(params)  → packingList by category
//   getProviderHealth()                → circuit breaker + key status
//
// Location params accepted:
//   { city }        — city name (e.g. "Goa", "Jaipur,IN")
//   { lat, lon }    — coordinates (preferred, more accurate)
//
// Caching strategy:
//   Namespace                   TTL     L
//   ──────────────────────────────────────────────────────────
//   weather:current             600s    Redis (L1) + MongoDB (L2/TTL)
//   weather:forecast            3600s   Redis (L1) + MongoDB (L2/TTL)
//   weather:intelligence        600s    Redis (L1 — full combined payload)
// ─────────────────────────────────────────────────────────────────────────────
const owmProvider        = require('./travel/providers/openWeather.provider')
const cacheService       = require('./cache.service')
const { WeatherCurrent, WeatherForecast } = require('../models/WeatherCache.model')
const logger             = require('../utils/logger')
const { computeTravelScore, buildPackingList, buildTravelSummary } = require('./travel/adapters/openWeather.adapter')

// ── TTL Constants ─────────────────────────────────────────────────────────────
const TTL = {
  current:      600,    // 10 min
  forecast:     3600,   // 60 min
  intelligence: 600,    // 10 min (same as current — changes with weather)
}

// ── Location key helpers ──────────────────────────────────────────────────────

/**
 * Build a canonical cache/DB key for a location.
 * Prefer coordinates (more precise); fall back to normalised city string.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {string}
 */
function locationKey({ city, lat, lon }) {
  if (lat != null && lon != null) {
    return `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`
  }
  return city?.trim().toLowerCase().replace(/\s+/g, '-') || 'unknown'
}

// ── MongoDB persistence ───────────────────────────────────────────────────────

async function persistCurrentWeather(locationKey, normalised) {
  if (!normalised?.current) return
  const cur = normalised.current
  try {
    await WeatherCurrent.findOneAndUpdate(
      { locationKey },
      {
        $set: {
          locationKey,
          cityName:       cur.cityName,
          tempC:          cur.tempC,
          feelsLikeC:     cur.feelsLikeC,
          tempMinC:       cur.tempMinC,
          tempMaxC:       cur.tempMaxC,
          humidity:       cur.humidity,
          pressure:       cur.pressure,
          windKmh:        cur.windKmh,
          windDeg:        cur.windDeg,
          windGustKmh:    cur.windGustKmh,
          conditionId:    cur.conditionId,
          conditionMain:  cur.conditionMain,
          conditionDesc:  cur.conditionDesc,
          conditionIcon:  cur.conditionIcon,
          owmIconCode:    cur.owmIconCode,
          visibilityM:    cur.visibilityM,
          cloudCover:     cur.cloudCover,
          rainMm1h:       cur.rainMm1h,
          snowMm1h:       cur.snowMm1h,
          travelScore:    cur.travelScore,
          sunriseAt:      cur.sunriseAt,
          sunsetAt:       cur.sunsetAt,
          source:         'OpenWeather',
          observedAt:     cur.observedAt ? new Date(cur.observedAt) : new Date(),
          expiresAt:      new Date(Date.now() + 10 * 60 * 1000),
        },
      },
      { upsert: true, returnDocument: 'after' }
    )
  } catch (err) {
    logger.warn(`[WeatherService] DB persist current failed: ${err.message}`)
  }
}

async function persistForecast(locationKey, normalised) {
  if (!normalised?.forecast?.length) return
  try {
    await WeatherForecast.findOneAndUpdate(
      { locationKey },
      {
        $set: {
          locationKey,
          cityName:       normalised.current?.cityName || null,
          forecast:       normalised.forecast,
          forecastDays:   normalised.forecast.length,
          packingList:    normalised.packingList || {},
          travelSummary:  normalised.travelSummary || {},
          source:         'OpenWeather',
          fetchedAt:      new Date(),
          expiresAt:      new Date(Date.now() + 60 * 60 * 1000),
        },
      },
      { upsert: true, returnDocument: 'after' }
    )
  } catch (err) {
    logger.warn(`[WeatherService] DB persist forecast failed: ${err.message}`)
  }
}

function persistAsync(key, data) {
  setImmediate(() => {
    Promise.all([
      persistCurrentWeather(key, data),
      persistForecast(key, data),
    ]).catch(err => logger.warn(`[WeatherService] persistAsync error: ${err.message}`))
  })
}

// ── MongoDB L2 cache lookup ───────────────────────────────────────────────────

async function getFromDB(key) {
  try {
    const [cur, fore] = await Promise.all([
      WeatherCurrent.findOne({ locationKey: key }).lean(),
      WeatherForecast.findOne({ locationKey: key }).lean(),
    ])
    if (!cur && !fore) return null

    return {
      current:       cur  ? _reshapeCurrentDoc(cur)  : null,
      forecast:      fore ? fore.forecast             : [],
      packingList:   fore ? fore.packingList          : null,
      travelSummary: fore ? fore.travelSummary        : null,
      packingHints:  [], // recomputed below if needed
      source:        'OpenWeather',
      fromDB:        true,
    }
  } catch (err) {
    logger.warn(`[WeatherService] DB lookup failed: ${err.message}`)
    return null
  }
}

function _reshapeCurrentDoc(doc) {
  return {
    type:           'current',
    cityName:       doc.cityName,
    tempC:          doc.tempC,
    feelsLikeC:     doc.feelsLikeC,
    tempMinC:       doc.tempMinC,
    tempMaxC:       doc.tempMaxC,
    humidity:       doc.humidity,
    pressure:       doc.pressure,
    windKmh:        doc.windKmh,
    windDeg:        doc.windDeg,
    windGustKmh:    doc.windGustKmh,
    conditionId:    doc.conditionId,
    conditionMain:  doc.conditionMain,
    conditionDesc:  doc.conditionDesc,
    conditionIcon:  doc.conditionIcon,
    owmIconCode:    doc.owmIconCode,
    visibilityM:    doc.visibilityM,
    cloudCover:     doc.cloudCover,
    rainMm1h:       doc.rainMm1h,
    snowMm1h:       doc.snowMm1h,
    travelScore:    doc.travelScore,
    sunriseAt:      doc.sunriseAt,
    sunsetAt:       doc.sunsetAt,
    advisory:       doc.travelScore?.advisory || null,
    observedAt:     doc.observedAt?.toISOString() || null,
  }
}

// ── Core fetch orchestrator ───────────────────────────────────────────────────

/**
 * Internal: fetch weather from OWM, cache, and persist.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<NormalisedWeather | null>}
 */
async function fetchAndCache(params) {
  const key      = locationKey(params)
  const redisKey = `weather:intelligence:${key}`

  // L1 — Redis
  const redisHit = await cacheService.getByNs('weather:current', redisKey)
  if (redisHit) {
    logger.info(`[WeatherService] CACHE HIT (Redis) for "${key}"`)
    return { ...redisHit, cached: true }
  }

  // L2 — MongoDB
  const dbHit = await getFromDB(key)
  if (dbHit?.current) {
    logger.info(`[WeatherService] CACHE HIT (MongoDB) for "${key}"`)
    cacheService.set('weather:current', redisKey, dbHit, TTL.current).catch(() => {})
    return { ...dbHit, cached: true }
  }

  // L3 — OWM API
  logger.info(`[WeatherService] CACHE MISS for "${key}" — fetching from OWM`)

  if (!owmProvider.config?.enabled) return null

  const data = await owmProvider.fetchWeather(params)
  if (!data) return null

  const result = { ...data, cached: false }

  // Cache to Redis (fire-and-forget)
  cacheService.set('weather:current', redisKey, result, TTL.current).catch(err =>
    logger.warn(`[WeatherService] Redis SET failed: ${err.message}`)
  )

  // Persist to MongoDB (fire-and-forget)
  persistAsync(key, data)

  return result
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get current weather conditions.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<{ current: NormalisedWeatherCurrent, cached: boolean } | null>}
 */
async function getCurrentWeather(params) {
  const data = await fetchAndCache(params)
  if (!data) return null
  return {
    current:  data.current,
    location: data.current?.cityName || null,
    cached:   data.cached,
    source:   data.source,
    fetchedAt: data.fetchedAt || new Date().toISOString(),
  }
}

/**
 * Get 5-day weather forecast with daily travel scores and rain probability.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<{ forecast: NormalisedWeatherForecast[], travelSummary: Object, cached: boolean } | null>}
 */
async function getForecast(params) {
  const data = await fetchAndCache(params)
  if (!data) return null
  return {
    forecast:      data.forecast,
    travelSummary: data.travelSummary,
    location:      data.current?.cityName || null,
    cached:        data.cached,
    source:        data.source,
    fetchedAt:     data.fetchedAt || new Date().toISOString(),
  }
}

/**
 * Get full weather intelligence: current + forecast + travel score + packing list.
 * This is the primary endpoint for trip planning.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<NormalisedWeather | null>}
 */
async function getWeatherIntelligence(params) {
  const data = await fetchAndCache(params)
  if (!data) return null
  return { ...data }
}

/**
 * Get travel suitability score only (lightweight call).
 * Uses cached data when available; does not force a fresh fetch.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<{ current: Object, forecast: Object[], cached: boolean } | null>}
 */
async function getTravelSuitability(params) {
  const data = await fetchAndCache(params)
  if (!data?.current) return null

  return {
    current: {
      score:    data.current.travelScore,
      location: data.current.cityName,
      tempC:    data.current.tempC,
      condition: data.current.conditionMain,
      advisory: data.current.advisory,
    },
    forecast: (data.forecast || []).map(d => ({
      date:            d.date,
      travelScore:     d.travelScore,
      travelLabel:     d.travelLabel,
      rainProbability: d.rainProbability,
      tempMinC:        d.tempMinC,
      tempMaxC:        d.tempMaxC,
      conditionIcon:   d.conditionIcon,
      advisory:        d.advisory,
    })),
    travelSummary: data.travelSummary,
    cached:        data.cached,
    source:        data.source,
  }
}

/**
 * Get categorised packing recommendations.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<{ packingList: Object, travelSummary: Object, cached: boolean } | null>}
 */
async function getPackingRecommendations(params) {
  const data = await fetchAndCache(params)
  if (!data) return null

  // If packingList not already computed (DB hit), rebuild
  const packingList = data.packingList || buildPackingList(data.current, data.forecast)

  return {
    location:      data.current?.cityName || null,
    packingList,
    travelSummary: data.travelSummary,
    forecast: (data.forecast || []).slice(0, 5).map(d => ({
      date:            d.date,
      conditionIcon:   d.conditionIcon,
      tempMinC:        d.tempMinC,
      tempMaxC:        d.tempMaxC,
      rainProbability: d.rainProbability,
    })),
    cached:        data.cached,
    source:        data.source,
  }
}

/**
 * Provider health status.
 */
async function getProviderHealth() {
  return owmProvider.healthStatus()
}

/**
 * Is OWM provider enabled?
 */
function isProviderEnabled() {
  return !!owmProvider.config?.enabled
}

module.exports = {
  getCurrentWeather,
  getForecast,
  getWeatherIntelligence,
  getTravelSuitability,
  getPackingRecommendations,
  getProviderHealth,
  isProviderEnabled,
}
