// backend/src/services/travel/providers/overpass.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// OpenStreetMap Overpass API provider — primary source for attraction data.
// Replaces OpenTripMap entirely.
//
// Overpass API:
//   Endpoint:   https://overpass-api.de/api/interpreter  (POST, body = OverpassQL)
//   Mirror:     https://overpass.kumi.systems/api/interpreter  (failover)
//   No API key required. Rate limit: ~2 req/s per IP, be respectful.
//
// Nominatim Geocoding (also part of OSM ecosystem):
//   Endpoint:   https://nominatim.openstreetmap.org/search
//   Already handled in travelApi.service.js — this provider receives lat/lon.
//
// Query covers all 6 requested attraction types:
//   1. Tourist attractions  (tourism=attraction)
//   2. Museums              (tourism=museum)
//   3. Parks                (leisure=park, leisure=nature_reserve, leisure=garden)
//   4. Historical monuments (historic=monument|castle|fort|ruins|memorial|...)
//   5. Viewpoints           (tourism=viewpoint)
//   6. Bonus: galleries, zoos, places of worship
//
// Response shape: `out center tags` — includes center coords for way/relation.
// ─────────────────────────────────────────────────────────────────────────────
const https = require('https')
const http  = require('http')
const { URL } = require('url')

const BaseProvider  = require('./BaseProvider')
const adapter       = require('../adapters/overpass.adapter')
const travelLogger  = require('../utils/travelLogger')
const providersCfg  = require('../../../config/travelProviders.config')

// Primary and failover endpoints
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Build an OverpassQL query that fetches all 6 attraction types
 * within a radius of the given coordinates.
 *
 * Strategy:
 *   - Query both `node` and `way` (and `relation` for large parks/areas)
 *   - Use `out center tags` so ways return a centroid coordinate
 *   - Filter by `name` to skip unnamed features
 *   - Timeout is set inside the query header for Overpass server enforcement
 *
 * @param {number} lat      — Centre latitude
 * @param {number} lon      — Centre longitude
 * @param {number} radiusM  — Search radius in metres
 * @param {number} limit    — Max total results (applied via Overpass `out N`)
 * @returns {string}        OverpassQL string
 */
function buildQuery(lat, lon, radiusM, limit) {
  const around = `(around:${radiusM},${lat},${lon})`

  return `
[out:json][timeout:25];
(
  node["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|aquarium|theme_park|artwork)$"]${around};
  way["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|aquarium|theme_park|artwork)$"]${around};
  relation["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|aquarium|theme_park|artwork)$"]${around};

  node["leisure"~"^(park|nature_reserve|garden)$"]${around};
  way["leisure"~"^(park|nature_reserve|garden)$"]${around};
  relation["leisure"~"^(park|nature_reserve|garden)$"]${around};

  node["historic"~"^(monument|castle|fort|ruins|archaeological_site|memorial|building|manor|mosque|church|temple)$"]${around};
  way["historic"~"^(monument|castle|fort|ruins|archaeological_site|memorial|building|manor|mosque|church|temple)$"]${around};
  relation["historic"~"^(monument|castle|fort|ruins|archaeological_site|memorial|building|manor|mosque|church|temple)$"]${around};

  node["natural"~"^(peak|waterfall|beach|hot_spring|cave_entrance)$"]${around};
  way["natural"~"^(peak|waterfall|beach|hot_spring|cave_entrance)$"]${around};
);
out center tags ${limit};
`.trim()
}

// ── HTTP POST to Overpass ─────────────────────────────────────────────────

/**
 * POST OverpassQL query to the Overpass API endpoint.
 * Tries primary endpoint first, falls back to mirror on network error.
 *
 * @param {string} query     — OverpassQL query string
 * @param {number} timeoutMs — Request timeout in ms
 * @returns {Promise<Object>} Parsed JSON response
 */
function postToOverpass(query, timeoutMs = 25000) {
  return _tryEndpoint(query, ENDPOINTS[0], timeoutMs).catch((err) => {
    travelLogger.warn('Overpass', `Primary endpoint failed (${err.message}) — trying mirror`)
    return _tryEndpoint(query, ENDPOINTS[1], timeoutMs)
  })
}

function _tryEndpoint(query, endpointUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = `data=${encodeURIComponent(query)}`
    const url  = new URL(endpointUrl)
    const isHttps = url.protocol === 'https:'
    const proto   = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname + url.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent':     'TripSetGo/1.0 (travel-planning-app; contact=admin@tripsetgo.app)',
        'Accept':         'application/json',
      },
      timeout: timeoutMs,
    }

    const req = proto.request(options, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')

        if (res.statusCode === 429) {
          return reject(new Error(`Overpass rate-limited (429) by ${endpointUrl}`))
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`Overpass HTTP ${res.statusCode} from ${endpointUrl}`))
        }

        try {
          resolve(JSON.parse(raw))
        } catch (e) {
          reject(new Error(`Overpass JSON parse error: ${e.message} — raw: ${raw.slice(0, 200)}`))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Overpass request timeout after ${timeoutMs}ms`))
    })

    req.on('error', (err) => {
      reject(new Error(`Overpass network error: ${err.message}`))
    })

    req.write(body)
    req.end()
  })
}

// ── Provider Class ────────────────────────────────────────────────────────

class OverpassProvider extends BaseProvider {
  constructor() {
    super(providersCfg.overpass)
  }

  // ── Attractions ───────────────────────────────────────────────────────────

  /**
   * Fetch tourist attractions, museums, parks, historical monuments,
   * and viewpoints from OpenStreetMap via the Overpass API.
   *
   * @param {Object} params
   * @param {number} params.lat
   * @param {number} params.lon
   * @param {number} [params.radiusM=10000]  — Search radius in metres (max 15 km)
   * @param {number} [params.limit=30]       — Max results from Overpass
   * @returns {Promise<NormalisedAttraction[]>}
   */
  async fetchAttractions({ lat, lon, radiusM = 10000, limit = 30 } = {}) {
    if (!this.config.enabled) return []

    // Clamp radius — Overpass can time out on very large areas
    const clampedRadius = Math.min(radiusM, 15000)
    const cacheRaw = `osm:attr:${lat},${lon},${clampedRadius},${limit}`

    return this.fetchWithCache('travel:attractions', cacheRaw, async () => {
      travelLogger.info(this.name, `Querying OSM attractions near (${lat}, ${lon}) r=${clampedRadius}m`)

      const query = buildQuery(lat, lon, clampedRadius, limit)
      let elements

      try {
        const raw = await postToOverpass(query, this.timeout)

        if (raw.remark) {
          travelLogger.warn(this.name, `Overpass remark: ${raw.remark}`)
        }

        elements = adapter.parseOverpassResponse(raw)
      } catch (err) {
        travelLogger.warn(this.name, `Overpass query failed: ${err.message}`)

        // Record failure for circuit breaker
        await this.circuitBreaker.recordFailure(err)
        return []
      }

      await this.circuitBreaker.recordSuccess()

      const normalised = adapter.normaliseMany(elements)

      // Sort: mustSee first, then by category priority, then name length (shorter = more famous)
      const sorted = _sortAttractions(normalised)

      travelLogger.info(this.name, `✅ Returning ${sorted.length} attractions`, {
        rawElements:  elements.length,
        named:        normalised.length,
        returned:     sorted.length,
      })

      return sorted
    })
  }

  // ── Hotels & Weather ──────────────────────────────────────────────────────
  // Overpass / OSM does not provide hotel pricing or weather data.

  async fetchHotels()  { return [] }
  async fetchWeather() { return null }
}

// ── Sorting ───────────────────────────────────────────────────────────────

const CATEGORY_PRIORITY = {
  Heritage:       10,
  Culture:         9,
  Viewpoint:       8,
  Nature:          7,
  Sightseeing:     6,
  Spiritual:       5,
  Entertainment:   4,
}

function _sortAttractions(attractions) {
  return attractions.sort((a, b) => {
    // mustSee always first
    if (a.mustSee && !b.mustSee) return -1
    if (!a.mustSee && b.mustSee)  return 1

    // Then by category priority
    const pa = CATEGORY_PRIORITY[a.category] || 0
    const pb = CATEGORY_PRIORITY[b.category] || 0
    if (pa !== pb) return pb - pa

    // Then shorter names (famous places tend to have concise names)
    return (a.name?.length || 999) - (b.name?.length || 999)
  })
}

module.exports = new OverpassProvider()
