// backend/src/services/travel/providers/foursquare.attraction.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// Foursquare Places v3 — Attraction Discovery Provider.
//
// Dedicated FSQ provider for tourist attractions, museums, parks, and
// historical places. Used as the secondary fallback in the provider registry
// (primary = Overpass/OpenTripMap).
//
// FSQ Category IDs used:
//   16000 = Outdoors & Recreation (tourist sites, general)
//   10027 = Museum
//   16032 = Park
//   16017 = Historic and Protected Sites
//   16020 = Landmark and Outdoors
//   10040 = Art Gallery
//
// API: Foursquare Places Search v3
//   GET /places/search?categories=<ids>&ll=<lat,lon>&radius=<m>
// ─────────────────────────────────────────────────────────────────────────────
const BaseProvider = require('./BaseProvider')
const adapter      = require('../adapters/foursquare.attraction.adapter')
const travelLogger = require('../utils/travelLogger')
const providersCfg = require('../../../config/travelProviders.config')

// ── FSQ Category ID Map ───────────────────────────────────────────────────────
const CATEGORIES = {
  attractions: '16000,16020',       // Outdoors & Recreation + Landmarks
  museums:     '10027,10040',       // Museums + Art Galleries
  parks:       '16032',             // Parks
  historical:  '16017',             // Historic and Protected Sites
  all:         '10027,10040,16000,16017,16020,16032', // Everything
}

const FSQ_LIST_FIELDS = [
  'fsq_id',
  'name',
  'categories',
  'geocodes',
  'location',
  'distance',
  'rating',
  'stats',
  'photos',
  'hours',
  'website',
  'verified',
  'popularity',
  'description',
].join(',')

class FoursquareAttractionProvider extends BaseProvider {
  constructor() {
    super(providersCfg.foursquare)
    this.name = 'Foursquare[Attractions]'
  }

  // ── Auth override ─────────────────────────────────────────────────────────

  async request(path, params = {}, headers = {}) {
    const key = this.keyRotator.next()
    if (key) headers.Authorization = key
    return super.request(path, params, headers)
  }

  // ── fetchAttractions (implements BaseProvider abstract) ───────────────────

  /**
   * General attraction search — used by the provider registry as secondary.
   *
   * @param {Object} params
   * @param {number}  params.lat
   * @param {number}  params.lon
   * @param {number}  [params.radiusM=10000]
   * @param {number}  [params.limit=20]
   * @param {string}  [params.kinds]  — maps to category type: 'museums'|'parks'|'historical'|'attractions'
   * @returns {Promise<NormalisedAttraction[]>}
   */
  async fetchAttractions({ lat, lon, radiusM = 10000, limit = 20, kinds } = {}) {
    if (!this.config.enabled) return []

    const categoryIds = CATEGORIES[kinds] || CATEGORIES.all
    return this._search({ lat, lon, radiusM, limit, categoryIds })
  }

  // ── Convenience methods for specific categories ───────────────────────────

  async searchAttractions({ lat, lon, radiusM = 10000, limit = 20 } = {}) {
    return this._search({ lat, lon, radiusM, limit, categoryIds: CATEGORIES.attractions })
  }

  async searchMuseums({ lat, lon, radiusM = 10000, limit = 20 } = {}) {
    return this._search({ lat, lon, radiusM, limit, categoryIds: CATEGORIES.museums })
  }

  async searchParks({ lat, lon, radiusM = 10000, limit = 20 } = {}) {
    return this._search({ lat, lon, radiusM, limit, categoryIds: CATEGORIES.parks })
  }

  async searchHistorical({ lat, lon, radiusM = 10000, limit = 20 } = {}) {
    return this._search({ lat, lon, radiusM, limit, categoryIds: CATEGORIES.historical })
  }

  // ── Internal search method ────────────────────────────────────────────────

  async _search({ lat, lon, radiusM, limit, categoryIds } = {}) {
    const cacheRaw = `fsq:attr:${lat},${lon}:r=${radiusM}:l=${limit}:cat=${categoryIds}`

    return this.fetchWithCache('attractions:nearby', cacheRaw, async () => {
      travelLogger.info(this.name, `Searching attractions near (${lat}, ${lon}) r=${radiusM}m`)

      try {
        const raw = await this.request('/places/search', {
          ll:         `${lat},${lon}`,
          categories: categoryIds,
          radius:     Math.min(radiusM, 100000),
          limit:      Math.min(limit, 50),
          fields:     FSQ_LIST_FIELDS,
          sort:       'POPULARITY',
        })

        const places = adapter.normaliseMany(raw?.results || [])
        await this.circuitBreaker.recordSuccess()
        travelLogger.info(this.name, `✅ Found ${places.length} attractions`)
        return places
      } catch (err) {
        travelLogger.warn(this.name, `fetchAttractions failed: ${err.message}`)
        await this.circuitBreaker.recordFailure(err)
        return []
      }
    })
  }

  async getAttractionDetail(fsqId) {
    if (!this.config.enabled) return null
    if (!fsqId?.trim()) return null

    const cacheRaw = `fsq:attr:detail:${fsqId}`

    return this.fetchWithCache('attractions:detail', cacheRaw, async () => {
      travelLogger.info(this.name, `Fetching detail for attraction fsqId="${fsqId}"`)

      try {
        const detail = await this.request(`/places/${encodeURIComponent(fsqId)}`, {
          fields: FSQ_LIST_FIELDS,
        })

        if (!detail?.fsq_id) {
          travelLogger.warn(this.name, `Empty detail response for fsqId="${fsqId}"`)
          return null
        }

        const normalised = adapter.normalise(detail)
        await this.circuitBreaker.recordSuccess()
        travelLogger.info(this.name, `✅ Attraction detail fetched for "${normalised?.name || fsqId}"`)
        return normalised
      } catch (err) {
        travelLogger.warn(this.name, `getAttractionDetail failed for "${fsqId}": ${err.message}`)
        await this.circuitBreaker.recordFailure(err)
        return null
      }
    })
  }

  // ── BaseProvider abstract stubs ────────────────────────────────────────────
  async fetchHotels()  { return [] }
  async fetchWeather() { return null }
}

module.exports = new FoursquareAttractionProvider()
