// backend/src/services/travel/providers/opentripmap.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// OpenTripMap (OTM) provider for tourist attractions discovery.
//
// OpenTripMap API:
//   Base URL: https://api.opentripmap.com/0.1/en/places
//   Auth: apikey query param
//   Free tier: ~5 req/s, 5000 req/day
//
// Endpoints used:
//   GET /geoname?name=Jaipur&apikey=KEY
//     → { name, country, lat, lon, osm_id, osm_type, population }
//
//   GET /radius?radius=10000&lon=75.8&lat=26.9&limit=20&kinds=...&rate=1&apikey=KEY
//     → { type: "FeatureCollection", features: [...] }
//     Each feature: { type, id, properties: { xid, name, dist, rate, kinds, wikidata, osm }, geometry }
//
//   GET /xid/{xid}?apikey=KEY
//     → { xid, name, rate, kinds, point, address, url, image, wikipedia, wikidata,
//         otm, preview: { source, height, width }, info: { descr, image, img_width, img_height } }
//
// This provider extends BaseProvider for:
//   ✅ Retry with exponential backoff
//   ✅ API key rotation
//   ✅ Circuit breaker
//   ✅ Cache-aside via fetchWithCache()
//   ✅ Rate limiting (token-bucket)
// ─────────────────────────────────────────────────────────────────────────────
const BaseProvider = require('./BaseProvider')
const adapter      = require('../adapters/opentripmap.adapter')
const travelLogger = require('../utils/travelLogger')
const providersCfg = require('../../../config/travelProviders.config')

// Default OTM kinds for a broad attraction search
const DEFAULT_KINDS = [
  'interesting_places',
  'historic',
  'museums',
  'natural',
  'religion',
  'parks',
  'cultural',
].join(',')

class OpenTripMapProvider extends BaseProvider {
  constructor() {
    super(providersCfg.openTripMap)
  }

  // ── Geocode City Name ────────────────────────────────────────────────────

  /**
   * Geocode a city name using OTM's /geoname endpoint.
   * Returns lat/lon for the city centre.
   *
   * @param {string} city — city name e.g. "Jaipur"
   * @returns {Promise<{ lat: number, lon: number, name: string } | null>}
   */
  async geocodeCity(city) {
    if (!this.config.enabled) return null

    const cacheRaw = `otm:geo:${city.trim().toLowerCase()}`
    return this.fetchWithCache('travel:geocode', cacheRaw, async () => {
      travelLogger.info(this.name, `Geocoding city "${city}"`)

      try {
        const data = await this.request('/geoname', {
          name:   city.trim(),
          lang:   'en',
        })

        if (!data?.lon || !data?.lat) return null

        return {
          lat:     parseFloat(data.lat),
          lon:     parseFloat(data.lon),
          name:    data.name || city,
          country: data.country,
          osmId:   data.osm_id,
          osmType: data.osm_type,
        }
      } catch (err) {
        travelLogger.warn(this.name, `Geocode failed for "${city}": ${err.message}`)
        return null
      }
    })
  }

  // ── Fetch Attractions (from lat/lon) ─────────────────────────────────────

  /**
   * Fetch attractions near given coordinates using OTM /radius endpoint.
   * This is the core method used by both city-search and nearby-search.
   *
   * @param {Object} params
   * @param {number} params.lat     — Latitude
   * @param {number} params.lon     — Longitude
   * @param {number} [params.radiusM=10000] — Radius in meters (max 50000)
   * @param {number} [params.limit=20]      — Max results (max 50)
   * @param {string} [params.kinds]         — Comma-separated OTM kinds
   * @param {number} [params.rate=1]        — Min popularity rate (0–3)
   * @returns {Promise<NormalisedAttraction[]>}
   */
  async fetchAttractions({ lat, lon, radiusM = 10000, limit = 20, kinds, rate = 0 } = {}) {
    if (!this.config.enabled) {
      travelLogger.warn(this.name, 'Provider disabled — OPENTRIPMAP_API_KEY not set')
      return []
    }

    const clampedRadius = Math.min(radiusM, 50000)
    const clampedLimit  = Math.min(limit, 50)
    const effectiveKinds = kinds || DEFAULT_KINDS
    const cacheRaw = `otm:radius:${lat},${lon},${clampedRadius},${clampedLimit},${effectiveKinds},${rate}`

    return this.fetchWithCache('attractions', cacheRaw, async () => {
      travelLogger.info(this.name, `Fetching attractions near (${lat}, ${lon}) r=${clampedRadius}m limit=${clampedLimit}`)

      try {
        const data = await this.request('/radius', {
          lat,
          lon,
          radius: clampedRadius,
          limit:  clampedLimit,
          kinds:  effectiveKinds,
          rate,
          format: 'json',
          lang:   'en',
        })

        // OTM radius endpoint returns an array directly (with format=json)
        const items = Array.isArray(data) ? data : (data?.features || []).map(f => ({
          xid:      f.properties?.xid,
          name:     f.properties?.name,
          rate:     f.properties?.rate,
          kinds:    f.properties?.kinds,
          dist:     f.properties?.dist,
          wikidata: f.properties?.wikidata,
          osm:      f.properties?.osm,
          point:    f.geometry?.coordinates
            ? { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
            : null,
        }))

        const normalised = adapter.normaliseMany(items)

        travelLogger.info(this.name, `✅ ${normalised.length} attractions normalised`, {
          rawItems: items.length,
        })

        return normalised
      } catch (err) {
        travelLogger.warn(this.name, `Radius fetch failed: ${err.message}`)
        await this.circuitBreaker.recordFailure(err)
        return []
      }
    })
  }

  // ── Fetch Attractions by City Name ────────────────────────────────────────

  /**
   * Find attractions by city name:
   * 1. Geocode city to lat/lon (OTM /geoname, cached 24h)
   * 2. Fetch radius attractions around city centre
   *
   * @param {Object} params
   * @param {string} params.city     — City name
   * @param {number} [params.radiusM=12000]
   * @param {number} [params.limit=20]
   * @param {string} [params.kinds]
   * @returns {Promise<{ attractions: NormalisedAttraction[], geo: Object | null }>}
   */
  async fetchAttractionsByCity({ city, radiusM = 12000, limit = 20, kinds } = {}) {
    if (!this.config.enabled) return { attractions: [], geo: null }

    const geo = await this.geocodeCity(city)
    if (!geo) {
      travelLogger.warn(this.name, `Cannot geocode city "${city}"`)
      return { attractions: [], geo: null }
    }

    const attractions = await this.fetchAttractions({
      lat:     geo.lat,
      lon:     geo.lon,
      radiusM,
      limit,
      kinds,
    })

    return { attractions, geo }
  }

  // ── Fetch Attraction Detail ───────────────────────────────────────────────

  /**
   * Fetch full attraction details including description, images, and address.
   *
   * @param {string} xid — OTM unique attraction ID (e.g. "Q133182")
   * @returns {Promise<NormalisedAttraction | null>}
   */
  async fetchAttractionDetail(xid) {
    if (!this.config.enabled) return null
    if (!xid?.trim()) return null

    const cacheRaw = `otm:detail:${xid}`

    return this.fetchWithCache('attractions:detail', cacheRaw, async () => {
      travelLogger.info(this.name, `Fetching detail for xid="${xid}"`)

      try {
        const detail = await this.request(`/xid/${encodeURIComponent(xid)}`, {})
        if (!detail?.xid) return null

        const normalised = adapter.normaliseDetail(detail)

        travelLogger.info(this.name, `✅ Detail fetched for "${normalised?.name || xid}"`)
        return normalised
      } catch (err) {
        travelLogger.warn(this.name, `Detail fetch failed for "${xid}": ${err.message}`)
        await this.circuitBreaker.recordFailure(err)
        return null
      }
    })
  }

  // ── BaseProvider overrides ────────────────────────────────────────────────
  // OTM doesn't provide hotels or weather — delegate to other providers.

  async fetchHotels()  { return [] }
  async fetchWeather() { return null }

  // ── request() override — inject apikey ────────────────────────────────────
  // BaseProvider._doRequest handles headers/params, but OTM needs apikey in query.

  async request(path, params = {}, headers = {}) {
    const key = this.keyRotator.next()
    if (!key) {
      const err = new Error(`${this.name}: No API keys available`)
      err.isAuthError = true
      throw err
    }
    return super.request(path, { ...params, apikey: key }, headers)
  }
}

module.exports = new OpenTripMapProvider()
