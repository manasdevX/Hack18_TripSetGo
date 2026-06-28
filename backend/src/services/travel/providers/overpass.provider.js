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
const { fetchWikiImage } = require('../utils/wikipediaImage')

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
  node["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|aquarium|theme_park)$"]["name"]${around};
  way["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|aquarium|theme_park)$"]["name"]${around};

  node["leisure"~"^(park|nature_reserve|garden)$"]["name"]${around};
  way["leisure"~"^(park|nature_reserve|garden)$"]["name"]${around};

  node["historic"~"^(monument|castle|fort|ruins|archaeological_site|memorial|building|manor|mosque|church|temple)$"]["name"]${around};
  way["historic"~"^(monument|castle|fort|ruins|archaeological_site|memorial|building|manor|mosque|church|temple)$"]["name"]${around};

  node["natural"~"^(peak|waterfall|beach|hot_spring|cave_entrance)$"]["name"]${around};
  way["natural"~"^(peak|waterfall|beach|hot_spring|cave_entrance)$"]["name"]${around};
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

      // Query more elements (min 100) to get a rich landmark set to filter/sort
      const dbLimit = Math.max(limit, 100)
      const query = buildQuery(lat, lon, clampedRadius, dbLimit)
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

      // Sort: mustSee first, then popularityScore, then category priority, name length
      const deduplicated = deduplicateAttractions(normalised)
      const sorted = _sortAttractions(deduplicated)

      // Slice to the actual requested limit
      const sliced = sorted.slice(0, limit)

      // Fetch Wikipedia images in parallel only for the sliced attractions (performance saving!)
      const imagePromises = sliced.map(async (a) => {
        if (!a.photo || !a.photo.startsWith('http')) {
          try {
            const wikiImg = await fetchWikiImage(a.name, a.wikipedia)
            if (wikiImg) {
              a.photo = wikiImg
              a.image = wikiImg
            }
          } catch (err) {
            // Ignore individual image failures
          }
        }
      })
      await Promise.allSettled(imagePromises)

      // Apply Unsplash fallback for anything that still doesn't have an image
      sliced.forEach(a => {
        if (!a.photo || !a.photo.startsWith('http')) {
          const fallback = getFallbackAttractionImage(a.category)
          a.photo = fallback
          a.image = fallback
        }
      })

      travelLogger.info(this.name, `✅ Returning ${sliced.length} attractions`, {
        rawElements:  elements.length,
        named:        normalised.length,
        returned:     sliced.length,
      })

      return sliced
    })
  }

  async fetchAttractionDetail(xid) {
    if (!xid?.startsWith('osm:')) return null
    const parts = xid.split(':')
    const type = parts[1] // 'node', 'way', or 'relation'
    const id = parseInt(parts[2], 10)
    if (!type || isNaN(id)) return null

    const query = `[out:json]; ${type}(${id}); out center tags;`
    try {
      const raw = await postToOverpass(query, this.timeout)
      const elements = adapter.parseOverpassResponse(raw)
      if (!elements.length) return null
      
      const normalised = adapter.normalise(elements[0])
      if (normalised && (!normalised.photo || !normalised.photo.startsWith('http'))) {
        try {
          const { fetchWikiImage } = require('../utils/wikipediaImage')
          const wikiImg = await fetchWikiImage(normalised.name, normalised.wikipedia)
          if (wikiImg) {
            normalised.photo = wikiImg
            normalised.image = wikiImg
          }
        } catch (e) {}
      }

      if (normalised && (!normalised.photo || !normalised.photo.startsWith('http'))) {
        const fallback = getFallbackAttractionImage(normalised.category)
        normalised.photo = fallback
        normalised.image = fallback
      }

      return normalised
    } catch (err) {
      travelLogger.warn(this.name, `fetchAttractionDetail failed for ${xid}: ${err.message}`)
      return null
    }
  }

  // ── Hotels & Weather ──────────────────────────────────────────────────────
  // Overpass / OSM does not provide hotel pricing or weather data.

  async fetchHotels()  { return [] }
  async fetchWeather() { return null }
}

const ATTR_IMAGE_MAP = {
  Heritage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&auto=format&fit=crop&q=80',
  Culture: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80',
  Nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop&q=80',
  Viewpoint: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&auto=format&fit=crop&q=80',
  Spiritual: 'https://images.unsplash.com/photo-1609137144813-1d0728c79213?w=600&auto=format&fit=crop&q=80',
  Entertainment: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
}

function getFallbackAttractionImage(category) {
  return ATTR_IMAGE_MAP[category] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80'
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

    // Then by popularityScore descending
    const scoreDiff = (b.popularityScore || 0) - (a.popularityScore || 0)
    if (scoreDiff !== 0) return scoreDiff

    // Then by category priority
    const pa = CATEGORY_PRIORITY[a.category] || 0
    const pb = CATEGORY_PRIORITY[b.category] || 0
    if (pa !== pb) return pb - pa

    // Then shorter names (famous places tend to have concise names)
    return (a.name?.length || 999) - (b.name?.length || 999)
  })
}

function distanceM(from, to) {
  if (!from || !to) return Infinity
  const R  = 6371000
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat  * Math.PI) / 180
  const Δφ = ((to.lat  - from.lat) * Math.PI) / 180
  const Δλ = ((to.lon  - from.lon) * Math.PI) / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function deduplicateAttractions(attractions) {
  const result = []
  for (const a of attractions) {
    let isDuplicate = false
    for (const existing of result) {
      const name1 = a.name.toLowerCase().trim()
      const name2 = existing.name.toLowerCase().trim()
      if (name1 === name2) {
        const dist = distanceM(a.coordinates, existing.coordinates)
        if (dist < 300) {
          isDuplicate = true
          if (a.popularityScore > existing.popularityScore || (a.mustSee && !existing.mustSee)) {
            existing.id = a.id
            existing.osmId = a.osmId
            existing.coordinates = a.coordinates
            existing.address = a.address || existing.address
            existing.popularityScore = a.popularityScore
            existing.photo = a.photo || existing.photo
            existing.image = a.image || existing.image
            existing.mustSee = a.mustSee || existing.mustSee
          }
          break
        }
      }
    }
    if (!isDuplicate) {
      result.push(a)
    }
  }
  return result
}

module.exports = new OverpassProvider()
