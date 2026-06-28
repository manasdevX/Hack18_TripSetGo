// backend/src/services/travel/providers/nominatim.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// Nominatim (OpenStreetMap) Geocoding Provider — keyless.
// ─────────────────────────────────────────────────────────────────────────────
const https = require('https')
const http  = require('http')
const { URL } = require('url')

const BaseProvider = require('./BaseProvider')
const travelLogger = require('../utils/travelLogger')
const providersCfg = require('../../../config/travelProviders.config')

class NominatimProvider extends BaseProvider {
  constructor() {
    super(providersCfg.nominatim)
    this.name = 'Nominatim'
  }

  /**
   * Geocode a query string into coordinates.
   *
   * @param {string} query
   * @returns {Promise<{ lat: number, lon: number, name: string, country: string } | null>}
   */
  async geocode(query) {
    if (!this.config.enabled) return null

    const cacheRaw = `nominatim:geo:${query.trim().toLowerCase()}`

    return this.fetchWithCache('travel:geocode', cacheRaw, async () => {
      travelLogger.info(this.name, `Geocoding query: "${query}"`)

      try {
        const params = {
          q:      query.trim(),
          format: 'json',
          limit:  '5',
          addressdetails: '1',
        }

        // We use request() from BaseProvider, but since Nominatim is very strict about User-Agent,
        // we must supply a descriptive header. BaseProvider requests already set a default TSG agent.
        const raw = await this.request('/search', params, {
          'User-Agent': 'TripSetGo/1.0 (travel-planning-app; contact=admin@tripsetgo.app)',
        })

        if (!Array.isArray(raw) || raw.length === 0) {
          travelLogger.warn(this.name, `No results found for "${query}"`)
          return null
        }

        // Pick the best match (prioritize administrative city boundaries or city/town types)
        let result = raw[0]
        for (const item of raw) {
          const type = (item.addresstype || '').toLowerCase()
          const isCityOrTown = type === 'city' || type === 'town' || type === 'administrative' || type === 'municipality'
          const isBoundary = item.class === 'boundary' && item.type === 'administrative'
          
          if (isCityOrTown || isBoundary) {
            result = item
            break
          }
        }

        if (!result.lat || !result.lon) return null

        const name = result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0]
        const country = result.address?.country || null

        travelLogger.info(this.name, `✅ Successfully geocoded "${query}" → (${result.lat}, ${result.lon})`)

        return {
          lat:     parseFloat(result.lat),
          lon:     parseFloat(result.lon),
          name:    name || query,
          country,
        }
      } catch (err) {
        travelLogger.warn(this.name, `Geocoding failed for "${query}": ${err.message}`)
        await this.circuitBreaker.recordFailure(err)
        return null
      }
    })
  }
}

module.exports = new NominatimProvider()
