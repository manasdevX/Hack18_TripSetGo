// backend/src/services/travel/providers/overpass.hotel.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// OpenStreetMap Overpass API hotel provider — keyless fallback.
// ─────────────────────────────────────────────────────────────────────────────
const https = require('https')
const http  = require('http')
const { URL } = require('url')

const BaseProvider  = require('./BaseProvider')
const travelLogger  = require('../utils/travelLogger')
const { fetchWikiImage } = require('../utils/wikipediaImage')

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

function buildQuery(lat, lon, radiusM, limit) {
  const around = `(around:${radiusM},${lat},${lon})`
  return `
[out:json][timeout:15];
(
  node["tourism"~"^(hotel|hostel|guest_house|motel)$"]["name"]${around};
  way["tourism"~"^(hotel|hostel|guest_house|motel)$"]["name"]${around};
);
out center tags ${limit};
`.trim()
}

function postToOverpass(query, timeoutMs = 15000) {
  return _tryEndpoint(query, ENDPOINTS[0], timeoutMs).catch((err) => {
    travelLogger.warn('OverpassHotels', `Primary endpoint failed (${err.message}) — trying mirror`)
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
          reject(new Error(`Overpass JSON parse error: ${e.message}`))
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

function getCoordinates(element) {
  if (element.type === 'node') {
    return element.lat != null && element.lon != null
      ? { lat: element.lat, lon: element.lon }
      : null
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon }
  }
  return null
}

function buildAddress(tags) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ]
  return parts.filter(Boolean).join(', ') || null
}

const HOTEL_IMAGE_MAP = {
  hostel: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop&q=80',
  guest_house: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80',
  motel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80',
}

function getFallbackHotelImage(tourism) {
  const clean = (tourism || '').toLowerCase().trim()
  return HOTEL_IMAGE_MAP[clean] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80'
}

function getPopularityScore(element, tags) {
  let score = 0
  if (tags.website || tags['contact:website']) score += 30
  if (tags.phone || tags['contact:phone']) score += 20
  if (tags.opening_hours) score += 15
  if (tags.wikidata) score += 25
  if (tags.wikipedia) score += 25
  if (element.type === 'way') score += 10
  return score
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  const lowerUrl = url.toLowerCase()
  return lowerUrl.includes('wikimedia.org') || lowerUrl.includes('unsplash.com') || lowerUrl.includes('wikipedia.org') || /\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$/i.test(lowerUrl)
}

function normalise(element) {
  const tags = element.tags || {}
  const name = tags.name || tags['name:en'] || tags['name:hi'] || null
  if (!name) return null

  const coordinates = getCoordinates(element)
  if (!coordinates) return null

  const address = buildAddress(tags)
  
  let image = null
  if (isValidImageUrl(tags.image)) image = tags.image
  else if (isValidImageUrl(tags.wikimedia_commons)) image = tags.wikimedia_commons

  const photo = image
  const photos = image ? [image] : []

  let priceTier = 2
  if (tags.tourism === 'hostel') {
    priceTier = 1
  }

  const popularityScore = getPopularityScore(element, tags)
  const rating = parseFloat((4.0 + (popularityScore / 100) * 0.9).toFixed(1))

  return {
    fsqId:          `osm-${element.type}-${element.id}`,
    source:         'OpenStreetMap',
    name,
    coordinates,
    address,
    city:           tags['addr:city'] || null,
    rating,
    totalRatings:   popularityScore > 0 ? Math.round(popularityScore * 1.5) : null,
    popularityScore,
    priceLevel:     priceTier,
    priceTier,
    priceInfo:      { level: priceTier, label: priceTier === 1 ? 'Budget' : 'Moderate', rangeINR: priceTier === 1 ? 'Under ₹1500' : '₹1500–₹4000' },
    photo,
    photos,
    image:          image || getFallbackHotelImage(tags.tourism),
    openingHours:   tags.opening_hours || null,
    isOpenNow:      null,
    phone:          tags.phone || tags['contact:phone'] || null,
    website:        tags.website || tags['contact:website'] || null,
    categories:     [tags.tourism || 'Hotel'],
    verified:       false,
    wikipedia:      tags.wikipedia || null,
  }
}

class OverpassHotelProvider extends BaseProvider {
  constructor() {
    super({
      name: 'OverpassHotels',
      baseUrl: 'https://overpass-api.de/api/interpreter',
      enabled: true,
      rateLimit: {
        strategy: 'token-bucket',
        maxRequests: 2,
        windowMs: 1000,
      },
    })
  }

  async searchByCity({ lat, lon, radiusM = 5000, limit = 20 } = {}) {
    const query = buildQuery(lat, lon, radiusM, limit)
    try {
      const raw = await postToOverpass(query)
      const list = (raw?.elements || [])
        .map(normalise)
        .filter(Boolean)
        .slice(0, limit)

      // Enrich with Wikipedia images if available asynchronously
      await Promise.all(
        list.slice(0, 10).map(async (h) => {
          if (!h.image || h.image.includes('unsplash.com')) {
            const img = await fetchWikiImage(h.name, h.wikipedia)
            if (img) {
              h.image = img
              h.photo = img
              h.photos = [img]
            }
          }
        })
      )

      return list
    } catch (err) {
      travelLogger.error(this.name, `searchByCity failed: ${err.message}`)
      return []
    }
  }

  async searchNearby(lat, lon, { radiusM = 2000, limit = 20 } = {}) {
    return this.searchByCity({ lat, lon, radiusM, limit })
  }

  async getHotelDetail(osmId) {
    if (!osmId || !osmId.startsWith('osm-')) return null
    const parts = osmId.split('-')
    if (parts.length < 3) return null
    const type = parts[1]
    const id = parts[2]

    const query = `
[out:json][timeout:10];
${type}(${id});
out center tags;
`.trim()

    try {
      const raw = await postToOverpass(query)
      if (!raw?.elements?.length) return null
      const h = normalise(raw.elements[0])
      if (h) {
        const img = await fetchWikiImage(h.name, h.wikipedia)
        if (img) {
          h.image = img
          h.photo = img
          h.photos = [img]
        }
      }
      return h
    } catch (err) {
      travelLogger.error(this.name, `getHotelDetail failed: ${err.message}`)
      return null
    }
  }
}

module.exports = new OverpassHotelProvider()
