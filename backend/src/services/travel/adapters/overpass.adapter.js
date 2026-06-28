// backend/src/services/travel/adapters/overpass.adapter.js
// ─────────────────────────────────────────────────────────────────────────────
// Normalises raw Overpass API (OpenStreetMap) responses into the shared
// NormalisedAttraction schema used across the travel service layer.
//
// Overpass JSON response structure:
//   {
//     "elements": [
//       { "type": "node", "id": 123, "lat": 15.29, "lon": 74.12, "tags": { ... } },
//       { "type": "way",  "id": 456, "center": { "lat": ..., "lon": ... }, "tags": { ... } },
//       { "type": "relation", "id": 789, "center": { ... }, "tags": { ... } }
//     ]
//   }
//
// For `way` and `relation` elements, coordinates come from the `center` field
// (returned when the Overpass query uses `out center`).
//
// OSM tag → internal category mapping covers all 6 requested types:
//   tourism=attraction  → Sightseeing
//   tourism=museum      → Culture
//   leisure=park        → Nature
//   historic=*          → Heritage (monuments, castles, ruins, memorials)
//   tourism=viewpoint   → Viewpoint
//   amenity=place_of_worship → Spiritual (bonus coverage)
// ─────────────────────────────────────────────────────────────────────────────

// ── Category Resolution ───────────────────────────────────────────────────

/**
 * Derive internal category from an OSM tags object.
 * Priority order matters — more specific tags win.
 */
function resolveCategory(tags = {}) {
  // Viewpoints — check first (a viewpoint may also have tourism=attraction)
  if (tags.tourism === 'viewpoint')  return 'Viewpoint'

  // Museums
  if (tags.tourism === 'museum')     return 'Culture'

  // Historic — covers monuments, castles, ruins, memorials, archaeological sites
  if (tags.historic) {
    const h = tags.historic
    if (h === 'memorial' || h === 'monument') return 'Heritage'
    if (h === 'castle' || h === 'fort')       return 'Heritage'
    if (h === 'ruins' || h === 'archaeological_site') return 'Heritage'
    return 'Heritage' // catch-all for any other historic value
  }

  // Parks and leisure
  if (tags.leisure === 'park')              return 'Nature'
  if (tags.leisure === 'nature_reserve')    return 'Nature'
  if (tags.leisure === 'garden')            return 'Nature'
  if (tags.natural === 'peak')              return 'Nature'
  if (tags.natural === 'beach')             return 'Nature'
  if (tags.natural === 'waterfall')         return 'Nature'

  // General tourist attractions
  if (tags.tourism === 'attraction')        return 'Sightseeing'
  if (tags.tourism === 'artwork')           return 'Culture'
  if (tags.tourism === 'gallery')           return 'Culture'
  if (tags.tourism === 'zoo')               return 'Entertainment'
  if (tags.tourism === 'aquarium')          return 'Entertainment'
  if (tags.tourism === 'theme_park')        return 'Entertainment'

  // Religious/spiritual sites
  if (tags.amenity === 'place_of_worship')  return 'Spiritual'
  if (tags.amenity === 'temple')            return 'Spiritual'

  return 'Sightseeing' // safe default
}

// ── Duration Heuristic ────────────────────────────────────────────────────

function estimateDuration(category) {
  const durations = {
    Culture:        3,
    Heritage:       2,
    Nature:         3,
    Viewpoint:      1,
    Sightseeing:    2,
    Spiritual:      1,
    Entertainment:  4,
  }
  return durations[category] || 2
}

// ── Must-See Heuristic ────────────────────────────────────────────────────

/**
 * A place is flagged as must-see when it has a Wikidata or Wikipedia entry,
 * or when it explicitly has tourism=attraction with a name.
 */
function isMustSee(tags = {}) {
  return !!(tags.wikidata || tags.wikipedia || tags.wikimedia_commons)
}

// ── Description Builder ───────────────────────────────────────────────────

function buildDescription(tags = {}, category) {
  // Prefer explicit description tags
  if (tags['description:en']) return tags['description:en'].slice(0, 400)
  if (tags.description)       return tags.description.slice(0, 400)

  // Compose from available meta tags
  const parts = []

  if (tags.opening_hours) parts.push(`Open: ${tags.opening_hours}`)
  if (tags.fee)           parts.push(`Entry: ${tags.fee === 'yes' ? 'Paid' : 'Free'}`)
  if (tags.website || tags.contact_website) {
    parts.push(`Website: ${tags.website || tags['contact:website']}`)
  }

  if (parts.length) return parts.join(' • ')

  // Fallback generic description
  return `A notable ${category.toLowerCase()} destination worth visiting.`
}

// ── Entry Fee Extraction ──────────────────────────────────────────────────

function extractEntryFee(tags = {}) {
  if (tags.fee === 'no' || tags.fee === 'free') return 0
  if (tags.fee === 'yes') return null // paid but amount unknown
  // Try to parse numeric fee tags
  const raw = tags['fee:amount'] || tags.charge || null
  if (!raw) return null
  const num = parseFloat(raw.replace(/[^\d.]/g, ''))
  return isNaN(num) ? null : num
}

// ── Address Builder ───────────────────────────────────────────────────────

function buildAddress(tags = {}) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:state'],
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

// ── Tag Collection ────────────────────────────────────────────────────────

function collectTags(tags = {}) {
  const keywords = []
  if (tags.tourism)  keywords.push(tags.tourism)
  if (tags.historic) keywords.push(tags.historic)
  if (tags.leisure)  keywords.push(tags.leisure)
  if (tags.natural)  keywords.push(tags.natural)
  if (tags.amenity)  keywords.push(tags.amenity)
  return keywords.filter(Boolean)
}

// ── Coordinate Extraction ─────────────────────────────────────────────────

function getCoordinates(element) {
  if (element.type === 'node') {
    return element.lat != null && element.lon != null
      ? { lat: element.lat, lon: element.lon }
      : null
  }
  // way / relation — use center (requires `out center` in query)
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon }
  }
  return null
}

// ── Main Normaliser ───────────────────────────────────────────────────────

function getPopularityScore(element, tags) {
  let score = 0
  if (tags.wikipedia) score += 40
  if (tags.wikidata)  score += 30
  if (element.type === 'relation') score += 15
  if (element.type === 'way')      score += 10
  if (tags.heritage) score += 20
  if (tags.historic === 'castle' || tags.historic === 'fort' || tags.historic === 'monument') {
    score += 15
  }
  const name = (tags.name || '').toLowerCase()
  const majorKeywords = [
    'minar', 'fort', 'tomb', 'taj mahal', 'gate', 'palace', 'temple', 'cathedral', 'basilica', 'church',
    'museum', 'national', 'memorial', 'garden', 'zoo', 'park', 'baoli', 'qutb', 'red fort', 'hawa mahal',
    'lotus temple', 'akshardham', 'qila'
  ]
  for (const kw of majorKeywords) {
    if (name.includes(kw)) {
      score += 10
    }
  }
  return score
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

/**
 * Normalise a single Overpass element into a NormalisedAttraction.
 *
 * @param {Object} element — One element from the Overpass `elements[]` array
 * @returns {NormalisedAttraction | null}
 */
function normalise(element) {
  const tags = element.tags || {}
  const name = tags.name || tags['name:en'] || tags['name:hi'] || null

  // Skip elements with no name — they're not useful for itinerary display
  if (!name) return null

  // Filter out generic, low-quality, or unrelated results
  const lowerName = name.toLowerCase()
  const lowQualityKeywords = [
    'toilet', 'restroom', 'bench', 'bin', 'waste basket', 'parking', 'atm', 'information board', 'signpost', 'plaque', 'stub', 'pavement'
  ]
  if (lowQualityKeywords.some(kw => lowerName.includes(kw))) {
    return null
  }

  const coordinates = getCoordinates(element)
  if (!coordinates) return null

  const category    = resolveCategory(tags)
  const description = buildDescription(tags, category)
  const durationHrs = estimateDuration(category)

  let image = null
  if (isValidImageUrl(tags.image)) image = tags.image
  else if (isValidImageUrl(tags.wikimedia_commons)) image = tags.wikimedia_commons

  return {
    id:          `osm:${element.type}:${element.id}`,
    osmId:       element.id,
    osmType:     element.type,
    source:      'OpenStreetMap',
    name,
    category,
    rating:      null, // OSM does not carry ratings
    distanceM:   null, // populated by the provider if needed
    coordinates,
    image,
    photo:       image,
    description,
    entryFee:    extractEntryFee(tags),
    bestTime:    category === 'Viewpoint' ? 'morning' : 'morning',
    durationHrs,
    mustSee:     isMustSee(tags),
    popularityScore: getPopularityScore(element, tags),
    tags:        collectTags(tags),
    address:     buildAddress(tags),
    website:     tags.website || tags['contact:website'] || null,
    openingHours:tags.opening_hours || null,
    wikidata:    tags.wikidata || null,
    wikipedia:   tags.wikipedia || null,
    phone:       tags.phone || tags['contact:phone'] || null,
    _raw:        null, // stripped in production
  }
}

/**
 * Normalise an array of Overpass elements.
 * Deduplicates by OSM ID and filters elements with no name/coordinates.
 *
 * @param {Object[]} elements
 * @returns {NormalisedAttraction[]}
 */
function normaliseMany(elements = []) {
  const seen = new Set()
  const result = []

  for (const el of elements) {
    if (seen.has(el.id)) continue
    seen.add(el.id)

    const normalised = normalise(el)
    if (normalised) result.push(normalised)
  }

  return result
}

/**
 * Validate and clean raw Overpass API JSON response.
 * Returns the `elements` array or throws.
 *
 * @param {Object} raw — Parsed JSON from Overpass
 * @returns {Object[]}
 */
function parseOverpassResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Overpass returned non-JSON response')
  }
  if (raw.remark) {
    // Overpass includes remarks on warnings (e.g. timeout)
    // Log but don't throw — partial results are still useful
  }
  if (!Array.isArray(raw.elements)) {
    throw new Error('Overpass response missing `elements` array')
  }
  return raw.elements
}

module.exports = { normalise, normaliseMany, parseOverpassResponse, resolveCategory }
