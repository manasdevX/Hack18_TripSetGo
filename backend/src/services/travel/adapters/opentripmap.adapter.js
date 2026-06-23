// backend/src/services/travel/adapters/opentripmap.adapter.js
// ─────────────────────────────────────────────────────────────────────────────
// Normalises OpenTripMap API responses into the shared NormalisedAttraction
// schema used across the TripSetGo travel service layer.
//
// OTM List item (from /radius or /bbox):
//   { xid, name, rate, dist, kinds, point: { lon, lat }, osm, wikidata }
//
// OTM Detail item (from /xid/{xid}):
//   { xid, name, rate, kinds, point, address, url, image, wikipedia,
//     wikidata, otm, preview: { source, ... }, info: { descr, ... } }
//
// Popularity score: OTM `rate` field is 0, 1, 2, 3, or "3h"
//   0    → score 0   (unknown / unrated)
//   1    → score 25  (minor interest)
//   2    → score 50  (notable)
//   3    → score 75  (popular)
//   "3h" → score 100 (heritage / highly important)
// ─────────────────────────────────────────────────────────────────────────────

// ── Category Mapping ─────────────────────────────────────────────────────────
// OTM uses comma-separated `kinds` tags (e.g. "museums,cultural,interesting_places")
// We map to our internal categories by priority.

const KIND_TO_CATEGORY = {
  // Nature
  natural:             'Nature',
  beaches:             'Nature',
  nature_reserves:     'Nature',
  parks:               'Nature',
  mountains:           'Nature',
  waterfalls:          'Nature',
  gorges:              'Nature',
  caves:               'Nature',
  hot_springs:         'Nature',

  // Heritage
  historic:            'Heritage',
  fortifications:      'Heritage',
  castles:             'Heritage',
  ruins:               'Heritage',
  archaeological_sites:'Heritage',
  memorials:           'Heritage',

  // Culture / Museums
  museums:             'Culture',
  art_galleries:       'Culture',
  galleries:           'Culture',
  theatres_and_entertainments: 'Entertainment',
  cultural:            'Culture',

  // Spiritual / Religion
  religion:            'Spiritual',
  temples:             'Spiritual',
  mosques:             'Spiritual',
  churches:            'Spiritual',
  monasteries:         'Spiritual',
  shrines:             'Spiritual',

  // Viewpoints
  viewpoints:          'Viewpoint',
  observation_platforms:'Viewpoint',

  // Entertainment
  amusements:          'Entertainment',
  zoos:                'Entertainment',
  water_parks:         'Entertainment',
  cinemas:             'Entertainment',
  sport:               'Entertainment',

  // Food
  restaurants:         'Food',
  food:                'Food',
}

/**
 * Resolve internal category from OTM kinds string.
 * @param {string} kinds — comma-separated OTM kinds e.g. "museums,cultural"
 * @returns {string} — internal category
 */
function resolveCategory(kinds = '') {
  const kindList = kinds.split(',').map(k => k.trim().toLowerCase())
  for (const kind of kindList) {
    if (KIND_TO_CATEGORY[kind]) return KIND_TO_CATEGORY[kind]
    // Partial match for compound kinds
    for (const [key, cat] of Object.entries(KIND_TO_CATEGORY)) {
      if (kind.includes(key) || key.includes(kind)) return cat
    }
  }
  return 'Sightseeing'
}

// ── Popularity Score ──────────────────────────────────────────────────────────

/**
 * Map OTM `rate` to a 0–100 popularity score.
 * @param {number|string} rate — OTM rate value (0, 1, 2, 3, "3h")
 * @returns {number}
 */
function mapRateToScore(rate) {
  const rateMap = { 0: 0, 1: 25, 2: 50, 3: 75, '3h': 100 }
  return rateMap[rate] ?? 0
}

// ── Duration Heuristic ────────────────────────────────────────────────────────

function estimateDuration(category) {
  const durations = {
    Culture:        3,
    Heritage:       2,
    Nature:         3,
    Viewpoint:      1,
    Sightseeing:    2,
    Spiritual:      1,
    Entertainment:  4,
    Food:           1.5,
  }
  return durations[category] || 2
}

// ── Must-See Heuristic ────────────────────────────────────────────────────────

function isMustSee(rate, wikidata) {
  return rate === '3h' || rate >= 3 || !!wikidata
}

// ── Image URL Builder ─────────────────────────────────────────────────────────

function extractImage(detail = {}) {
  // Prefer preview source (higher quality thumbnail)
  if (detail.preview?.source) return detail.preview.source
  if (detail.image)           return detail.image
  return null
}

// ── Description Builder ───────────────────────────────────────────────────────

function buildDescription(detail = {}) {
  // OTM detail has info.descr (usually from Wikipedia)
  const descr = detail.info?.descr
  if (descr) return descr.slice(0, 600)

  // Fallback to wikipedia/url cues
  const category = resolveCategory(detail.kinds || '')
  return `A notable ${category.toLowerCase()} attraction.`
}

// ── Address Builder ───────────────────────────────────────────────────────────

function buildAddress(detail = {}) {
  const addr = detail.address || {}
  const parts = [
    addr.road,
    addr.suburb,
    addr.city || addr.town || addr.village || addr.county,
    addr.state,
    addr.country,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

// ── List Item Normaliser ──────────────────────────────────────────────────────

/**
 * Normalise a single OTM list item (from /radius endpoint) into NormalisedAttraction.
 *
 * @param {Object} item — OTM list result object
 * @returns {NormalisedAttraction | null}
 */
function normalise(item) {
  if (!item?.xid || !item?.name) return null

  const point = item.point || {}
  const lat   = parseFloat(point.lat)
  const lon   = parseFloat(point.lon)

  if (isNaN(lat) || isNaN(lon)) return null

  const category      = resolveCategory(item.kinds || '')
  const popularityScore = mapRateToScore(item.rate)

  return {
    id:             `otm:${item.xid}`,
    xid:            item.xid,
    source:         'OpenTripMap',
    name:           item.name,
    category,
    rating:         null, // OTM list doesn't carry ratings; use popularityScore
    popularityScore,
    distanceM:      item.dist || null,
    coordinates:    { lat, lon },
    image:          null, // populated by detail fetch
    description:    null, // populated by detail fetch
    entryFee:       null,
    bestTime:       'morning',
    durationHrs:    estimateDuration(category),
    mustSee:        isMustSee(item.rate, item.wikidata),
    tags:           (item.kinds || '').split(',').map(k => k.trim()).filter(Boolean),
    address:        null,
    website:        null,
    wikidata:       item.wikidata || null,
    wikipedia:      null,
    phone:          null,
    openingHours:   null,
    osm:            item.osm || null,
    _raw:           null,
  }
}

// ── Detail Item Normaliser ────────────────────────────────────────────────────

/**
 * Normalise a full OTM detail object (from /xid/{xid}) into NormalisedAttraction.
 *
 * @param {Object} detail — OTM detail object
 * @returns {NormalisedAttraction | null}
 */
function normaliseDetail(detail) {
  if (!detail?.xid) return null

  const name  = detail.name || 'Unnamed Attraction'
  const point = detail.point || {}
  const lat   = parseFloat(point.lat)
  const lon   = parseFloat(point.lon)

  if (isNaN(lat) || isNaN(lon)) return null

  const category      = resolveCategory(detail.kinds || '')
  const popularityScore = mapRateToScore(detail.rate)
  const image         = extractImage(detail)
  const description   = buildDescription(detail)
  const address       = buildAddress(detail)

  return {
    id:             `otm:${detail.xid}`,
    xid:            detail.xid,
    source:         'OpenTripMap',
    name,
    category,
    rating:         null,
    popularityScore,
    distanceM:      null,
    coordinates:    { lat, lon },
    images:         image ? [image] : [],
    image,
    description,
    entryFee:       null,
    bestTime:       'morning',
    durationHrs:    estimateDuration(category),
    mustSee:        isMustSee(detail.rate, detail.wikidata),
    tags:           (detail.kinds || '').split(',').map(k => k.trim()).filter(Boolean),
    address,
    website:        detail.url || null,
    wikidata:       detail.wikidata || null,
    wikipedia:      detail.wikipedia || null,
    phone:          null,
    openingHours:   null,
    osm:            detail.osm || null,
    otmUrl:         detail.otm || null,
    preview:        detail.preview || null,
    _raw:           null,
  }
}

/**
 * Normalise an array of OTM list items.
 * Filters items with no name or invalid coordinates.
 *
 * @param {Object[]} items
 * @returns {NormalisedAttraction[]}
 */
function normaliseMany(items = []) {
  const seen   = new Set()
  const result = []

  for (const item of items) {
    if (!item?.xid || seen.has(item.xid)) continue
    seen.add(item.xid)

    const normalised = normalise(item)
    if (normalised) result.push(normalised)
  }

  return result
}

module.exports = {
  normalise,
  normaliseMany,
  normaliseDetail,
  resolveCategory,
  mapRateToScore,
}
