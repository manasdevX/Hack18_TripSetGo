// backend/src/services/travel/travelApi.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Production-grade travel API service — main orchestrator.
//
// Public API (consumed by planner.controller.js):
//   enrichPlan(plan, input)  → enriched plan (never throws)
//   geocodeDestination(name) → { lat, lon, name, country } | null
//   healthCheck()            → provider health statuses
//
// Internal data flow:
//   1. Geocode destination name → lat/lon (Nominatim, cached 24h)
//   2. Fire parallel requests:
//        a. Attractions: OTM (primary) → FSQ (secondary if insufficient)
//        b. Hotels:      Amadeus
//        c. Weather:     OpenWeather
//   3. Aggregate each domain (dedup, rank, tier)
//   4. Enrich plan with live data via planEnricher.js
//   5. Cache the enriched composite result (2h TTL)
//   6. Emit structured metric log for APM
//
// On any provider failure, the relevant domain falls through gracefully:
//   - Attractions: [] → Gemini/fallback text preserved
//   - Hotels:      {} → Gemini/fallback hotel tiers preserved
//   - Weather:     null → Gemini/fallback weather block preserved
// ─────────────────────────────────────────────────────────────────────────────
const https = require('https')
const { URL } = require('url')

const travelLogger  = require('./utils/travelLogger')
const cacheService  = require('../cache.service')
const { patchTravelTTLs } = require('./cache/travelCache.config')

const registry      = require('./providerRegistry')
const attractionAgg = require('./aggregators/attractions.aggregator')
const hotelAgg      = require('./aggregators/hotels.aggregator')
const weatherAgg    = require('./aggregators/weather.aggregator')
const { enrich }    = require('./planEnricher')

// Patch travel TTL namespaces into cache.service on first import
patchTravelTTLs()

const mapboxProvider = require('./providers/mapbox.provider')
const nominatimProvider = require('./providers/nominatim.provider')

// ── Mapbox Geocoder ───────────────────────────────────────────────────────
// Used to convert destination name → lat/lon for proximity-based API calls.

/**
 * Geocode a city name using Nominatim (OpenStreetMap).
 * Cached for 24 hours.
 *
 * @param {string} destination — e.g. "Goa", "Manali", "Jaipur"
 * @returns {Promise<{ lat: number, lon: number, name: string } | null>}
 */
async function geocodeDestination(destination) {
  const cacheRaw = `nominatim:v2:${destination.trim().toLowerCase()}`
  const cached   = await cacheService.getByNs('travel:geocode', cacheRaw)

  if (cached) {
    travelLogger.cache('Nominatim', 'HIT', 'travel:geocode', { destination })
    return cached
  }

  // 1. Try Mapbox if enabled
  if (mapboxProvider.config?.enabled) {
    travelLogger.info('Mapbox', `Geocoding "${destination}"`)
    try {
      const result = await mapboxProvider.geocode(destination)
      if (result) {
        const coords = { lat: result.coordinates.lat, lon: result.coordinates.lon, name: result.name, country: result.country }
        await cacheService.set('travel:geocode', cacheRaw, coords)
        travelLogger.info('Mapbox', `✅ Geocoded "${destination}" → (${result.coordinates.lat}, ${result.coordinates.lon})`)
        return coords
      }
    } catch (err) {
      travelLogger.warn('Mapbox', `Geocoding failed for "${destination}": ${err.message}`)
    }
  }

  // 2. Fallback to Nominatim (always enabled)
  travelLogger.info('Nominatim', `Geocoding fallback for "${destination}"`)
  try {
    const result = await nominatimProvider.geocode(destination)
    if (result) {
      const coords = { lat: result.lat, lon: result.lon, name: result.name, country: result.country }
      await cacheService.set('travel:geocode', cacheRaw, coords)
      return coords
    }
  } catch (err) {
    travelLogger.warn('Nominatim', `Geocoding failed for "${destination}": ${err.message}`)
  }

  return null
}

// Removed _nominatimSearch


// ── Removed IATA City Code Resolution ─────────────────────────────────────
// Amadeus required IATA codes. Foursquare uses coordinates, so this is no longer needed.

// ── Date Utilities ────────────────────────────────────────────────────────

function buildCheckoutDate(startDate, days) {
  const d = new Date(startDate || Date.now())
  d.setDate(d.getDate() + (days || 3))
  return d.toISOString().split('T')[0]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ── Main enrichPlan ───────────────────────────────────────────────────────

/**
 * Enrich an existing plan with live data from all providers.
 * This is the single entry point called by planner.controller.js.
 *
 * @param {Object} plan   — Gemini or fallbackPlanner output
 * @param {Object} input  — { destination, budget, days, startDate?, interests? }
 * @returns {Promise<Object>}  Always returns a plan (enriched or original)
 */
async function enrichPlan(plan, input) {
  const { destination, budget, days } = input
  const startDate = input.startDate || todayISO()
  const requestStart = Date.now()

  const providersAttempted = []
  const providersSucceeded = []
  const cacheHits          = []
  const enrichedFields     = []

  // ── 1. Geocode ────────────────────────────────────────────────────────
  const geo = await geocodeDestination(destination)
  if (!geo) {
    travelLogger.warn('travelApi', `Cannot geocode "${destination}" — returning unenriched plan`)
    return plan
  }

  const { lat, lon } = geo

  // ── 2. Parallel data fetch ────────────────────────────────────────────
  // checkIn / checkOut kept for fallback/legacy logic if needed by aggregators
  const checkIn  = startDate
  const checkOut = buildCheckoutDate(startDate, days)

  const [attractionResult, hotelsRaw, weatherRaw] = await Promise.allSettled([
    (async () => {
      providersAttempted.push('OpenTripMap', 'Foursquare')
      const r = await registry.fetchAttractions({ lat, lon, radiusM: 12000, limit: 20 })
      if (r.primary.length || r.secondary.length) {
        providersSucceeded.push('OpenTripMap')
        if (r.secondary.length) providersSucceeded.push('Foursquare')
      }
      return r
    })(),

    (async () => {
      providersAttempted.push('Foursquare[Hotels]')
      // Foursquare uses lat/lon + radius
      const r = await registry.fetchHotels({ lat, lon, city: destination, radiusM: 10000, limit: 15 })
      if (r.length) providersSucceeded.push('Foursquare[Hotels]')
      return r
    })(),

    (async () => {
      providersAttempted.push('OpenWeather')
      const r = await registry.fetchWeather({ city: `${destination},IN`, lat, lon })
      if (r) providersSucceeded.push('OpenWeather')
      return r
    })(),
  ])

  // Safely unwrap settled promises
  const attrResult = attractionResult.status === 'fulfilled' ? attractionResult.value : { primary: [], secondary: [] }
  const hotels     = hotelsRaw.status      === 'fulfilled' ? hotelsRaw.value      : []
  const weatherRawVal = weatherRaw.status  === 'fulfilled' ? weatherRaw.value     : null

  // ── 3. Aggregate ──────────────────────────────────────────────────────
  const attractions = attractionAgg.aggregate(attrResult.primary, attrResult.secondary)
  const hotelResult = hotelAgg.aggregate(hotels, budget, days)
  const weather     = weatherAgg.aggregate(weatherRawVal, startDate, days)

  if (attractions.length > 0) enrichedFields.push('attractions')
  if (hotelResult.options?.length > 0) enrichedFields.push('hotels')
  if (weather.available) enrichedFields.push('weather')

  // ── 4. Enrich plan ────────────────────────────────────────────────────
  const enrichedPlan = enrich(plan, {
    attractions,
    hotelResult,
    weather,
    nights: days,
    budget,
  })

  // ── 5. Cache enriched result ──────────────────────────────────────────
  const sortedInterests = [...(input.interests || [])].sort()
  const enrichedCacheRaw = `enriched:${destination}|${budget}|${days}|${sortedInterests.join(',')}`

  cacheService.set('travel:enriched', enrichedCacheRaw, enrichedPlan).catch(err => {
    travelLogger.warn('travelApi', `Failed to cache enriched plan: ${err.message}`)
  })

  // ── 6. Emit metric log ────────────────────────────────────────────────
  travelLogger.metric({
    event:                'travel:request',
    destination,
    lat,
    lon,
    providersAttempted,
    providersSucceeded,
    cacheHits,
    enrichedFields,
    attractionsCount:     attractions.length,
    hotelsCount:          hotels.length,
    weatherAvailable:     weather.available,
    totalLatencyMs:       Date.now() - requestStart,
    usedFallback:         !!plan._isFallback,
  })

  travelLogger.info('travelApi', `✅ Plan enriched for "${destination}"`, {
    enrichedFields,
    latencyMs: Date.now() - requestStart,
  })

  return enrichedPlan
}

// ── Health Check ──────────────────────────────────────────────────────────

/**
 * Get health status of all registered travel providers.
 * Called by admin/health endpoint.
 */
async function healthCheck() {
  return registry.healthCheck()
}

module.exports = { enrichPlan, geocodeDestination, healthCheck }
