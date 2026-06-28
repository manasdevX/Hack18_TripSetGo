// backend/src/services/travel/providers/overpass.restaurant.provider.js
// ─────────────────────────────────────────────────────────────────────────────
// OpenStreetMap Overpass API restaurant provider — keyless fallback.
// ─────────────────────────────────────────────────────────────────────────────
const https = require('https')
const http  = require('http')
const { URL } = require('url')

const BaseProvider  = require('./BaseProvider')
const travelLogger  = require('../utils/travelLogger')
const providersCfg  = require('../../../config/travelProviders.config')
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
  node["amenity"~"^(restaurant|cafe|fast_food|pub|bar|food_court)$"]${around};
  way["amenity"~"^(restaurant|cafe|fast_food|pub|bar|food_court)$"]${around};
);
out center tags ${limit};
`.trim()
}

function postToOverpass(query, timeoutMs = 15000) {
  return _tryEndpoint(query, ENDPOINTS[0], timeoutMs).catch((err) => {
    travelLogger.warn('OverpassRestaurants', `Primary endpoint failed (${err.message}) — trying mirror`)
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

const CUISINE_IMAGE_MAP = {
  indian: 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?w=600&auto=format&fit=crop&q=80',
  muglai: 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?w=600&auto=format&fit=crop&q=80',
  biryani: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
  italian: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&auto=format&fit=crop&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
  fast_food: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&auto=format&fit=crop&q=80',
  chinese: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80',
  asian: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80',
  cafe: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  dessert: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  bar: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=80',
  pub: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=80',
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('wikimedia.org') || lowerUrl.includes('unsplash.com') || lowerUrl.includes('wikipedia.org')) {
    return true
  }
  return /\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$/i.test(lowerUrl)
}

function getFallbackRestaurantImage(cuisines = [], amenity) {
  for (const c of cuisines) {
    const cleanC = c.toLowerCase().trim()
    if (CUISINE_IMAGE_MAP[cleanC]) return CUISINE_IMAGE_MAP[cleanC]
    for (const [key, val] of Object.entries(CUISINE_IMAGE_MAP)) {
      if (cleanC.includes(key)) return val
    }
  }
  const cleanAmenity = (amenity || '').toLowerCase().trim()
  if (CUISINE_IMAGE_MAP[cleanAmenity]) return CUISINE_IMAGE_MAP[cleanAmenity]
  return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'
}

function getPopularityScore(element, tags) {
  let score = 0
  if (tags.website || tags['contact:website']) score += 30
  if (tags.phone || tags['contact:phone']) score += 20
  if (tags.opening_hours) score += 15
  if (tags.wikidata) score += 25
  if (tags.wikipedia) score += 25
  if (element.type === 'way') score += 10
  
  const name = (tags.name || '').toLowerCase()
  const majorChains = [
    'starbucks', 'mcdonald', 'kfc', 'burger king', 'subway', 'domino', 'pizza hut', 'dunkin', 'cafe coffee day', 'ccd', 'haldiram', 'saravana'
  ]
  for (const chain of majorChains) {
    if (name.includes(chain)) {
      score += 15
    }
  }
  return score
}

function normalise(element) {
  const tags = element.tags || {}
  const name = tags.name || tags['name:en'] || tags['name:hi'] || null
  if (!name) return null

  // Filter out generic, low-quality, or unrelated results
  const lowerName = name.toLowerCase()
  const lowQualityKeywords = [
    'vending', 'water cooler', 'drinking water', 'soup kitchen', 'pantry', 'canteen', 'mess', 'tiffin room', 'vending machine'
  ]
  if (lowQualityKeywords.some(kw => lowerName.includes(kw))) {
    return null
  }

  const coordinates = getCoordinates(element)
  if (!coordinates) return null

  const cuisines = (tags.cuisine || '')
    .split(';')
    .map(c => c.trim())
    .filter(Boolean)

  if (cuisines.length === 0) {
    if (tags.amenity === 'cafe') cuisines.push('Cafe')
    else if (tags.amenity === 'fast_food') cuisines.push('Fast Food')
    else if (tags.amenity === 'pub') cuisines.push('Pub')
    else if (tags.amenity === 'bar') cuisines.push('Bar')
    else cuisines.push('Restaurant')
  }

  const address = buildAddress(tags)
  
  // Validate any provided image URLs
  let image = null
  if (isValidImageUrl(tags.image)) image = tags.image
  else if (isValidImageUrl(tags.wikimedia_commons)) image = tags.wikimedia_commons

  const photo = image
  const photos = image ? [image] : []

  let priceTier = 2
  if (tags.amenity === 'fast_food' || tags.amenity === 'cafe') {
    priceTier = 1
  }

  const popularityScore = getPopularityScore(element, tags)
  const rating = parseFloat((4.0 + (popularityScore / 100) * 0.9).toFixed(1))

  return {
    id:             `osm:${element.type}:${element.id}`,
    fsqId:          `osm-${element.type}-${element.id}`,
    source:         'OpenStreetMap',
    name,
    coordinates,
    address,
    city:           tags['addr:city'] || null,
    neighborhood:   tags['addr:suburb'] || tags['addr:neighbourhood'] || null,

    // Cuisine & dietary
    cuisines,
    dietaryOptions: [],
    tastes:         cuisines,

    // Ratings & popularity
    rating,
    totalRatings:   popularityScore > 0 ? Math.round(popularityScore * 1.5) : null,
    popularityScore,

    // Price
    priceLevel:     priceTier,
    priceTier,
    priceInfo:      { level: priceTier, label: priceTier === 1 ? 'Budget' : 'Moderate', rangeINR: priceTier === 1 ? 'Under ₹200' : '₹200–₹500' },

    // Media
    photos,
    image,
    photo,

    // Hours
    openingHours:   { display: tags.opening_hours || 'Open daily', isOpen: true },
    isOpen:         true,
    isOpenNow:      true,

    // Contact
    phone:          tags.phone || tags['contact:phone'] || null,
    website:        tags.website || tags['contact:website'] || null,
    menu:           tags.menu || tags['contact:menu'] || null,

    distanceM:      null,
    distanceLabel:  null,
    description:    tags.description || null,
    verified:       false,
    category:       cuisines[0] || 'Restaurant',
  }
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

function deduplicateVenues(venues) {
  const result = []
  for (const v of venues) {
    let isDuplicate = false
    for (const existing of result) {
      const name1 = v.name.toLowerCase().trim()
      const name2 = existing.name.toLowerCase().trim()
      if (name1 === name2) {
        const dist = distanceM(v.coordinates, existing.coordinates)
        if (dist < 300) {
          isDuplicate = true
          if (v.popularityScore > existing.popularityScore) {
            existing.id = v.id
            existing.fsqId = v.fsqId
            existing.coordinates = v.coordinates
            existing.address = v.address || existing.address
            existing.popularityScore = v.popularityScore
            existing.rating = v.rating
            existing.photo = v.photo || existing.photo
            existing.image = v.image || existing.image
            existing.photos = v.photos || existing.photos
          }
          break
        }
      }
    }
    if (!isDuplicate) {
      result.push(v)
    }
  }
  return result
}

class OverpassRestaurantProvider extends BaseProvider {
  constructor() {
    super(providersCfg.overpass)
    this.name = 'Overpass[Restaurants]'
  }

  async searchRestaurants({
    lat,
    lon,
    radiusM    = 3000,
    limit      = 20,
  } = {}) {
    if (!this.config.enabled) return []

    const clampedRadius = Math.min(radiusM, 15000)
    const cacheRaw = `osm:restaurants:${lat},${lon},${clampedRadius},${limit}`

    return this.fetchWithCache('restaurants:city', cacheRaw, async () => {
      travelLogger.info(this.name, `Querying OSM restaurants near (${lat}, ${lon}) r=${clampedRadius}m`)

      const dbLimit = Math.max(limit, 100)
      const query = buildQuery(lat, lon, clampedRadius, dbLimit)
      let elements = []

      try {
        const raw = await postToOverpass(query, this.timeout)
        elements = raw.elements || []
      } catch (err) {
        travelLogger.warn(this.name, `Overpass query failed: ${err.message}`)
        await this.circuitBreaker.recordFailure(err)
        return []
      }

      await this.circuitBreaker.recordSuccess()

      const normalised = []
      const seen = new Set()

      for (const el of elements) {
        if (!el.tags?.name || seen.has(el.id)) continue
        seen.add(el.id)
        const norm = normalise(el)
        if (norm) normalised.push(norm)
      }

      // Deduplicate before slicing to the limit
      const deduplicated = deduplicateVenues(normalised)
      const sorted = deduplicated.sort((a, b) => b.popularityScore - a.popularityScore)
      const sliced = sorted.slice(0, limit)

      // Parallel Wikipedia images lookup
      const imagePromises = sliced.map(async (r) => {
        if (!r.photo || !r.photo.startsWith('http')) {
          try {
            const wikiImg = await fetchWikiImage(r.name)
            if (wikiImg) {
              r.photo = wikiImg
              r.image = wikiImg
              r.photos = [wikiImg]
            }
          } catch (err) {
            // Ignore Wikipedia search errors
          }
        }
      })
      await Promise.allSettled(imagePromises)

      // Apply Unsplash fallback for anything that still doesn't have an image
      sliced.forEach(r => {
        if (!r.photo || !r.photo.startsWith('http')) {
          const fallback = getFallbackRestaurantImage(r.cuisines, r.category)
          r.photo = fallback
          r.image = fallback
          r.photos = [fallback]
        }
      })

      return sliced
    })
  }

  async searchByCity({ lat, lon, radiusM = 5000, limit = 20 } = {}) {
    return this.searchRestaurants({ lat, lon, radiusM, limit })
  }

  async getRestaurantDetail(fsqId) {
    return null
  }
}

module.exports = new OverpassRestaurantProvider()
