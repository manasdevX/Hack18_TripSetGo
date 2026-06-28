// backend/src/services/travel/adapters/foursquare.restaurant.adapter.js
// ─────────────────────────────────────────────────────────────────────────────
// Normalises Foursquare Places API v3 responses into a NormalisedRestaurant
// schema specifically designed for restaurant discovery.
//
// FSQ v3 place search response (with restaurant fields):
//   { results: [{ fsq_id, name, categories, geocodes, location, distance,
//       rating, stats, photos, hours, hours_popular, price, tel, website,
//       tastes, features, menu, popularity, ... }] }
//
// FSQ v3 detail response (/places/{fsq_id}):
//   { fsq_id, name, categories, geocodes, location, distance, rating, stats,
//     photos, hours, hours_popular, price, tel, website, tastes, features,
//     menu, popularity, description, ... }
//
// Price level mapping (FSQ price 1–4):
//   1 → Budget     (₹ / under ₹200/person)
//   2 → Moderate   (₹₹ / ₹200–500)
//   3 → Upscale    (₹₹₹ / ₹500–1500)
//   4 → Fine Dining(₹₹₹₹ / above ₹1500)
// ─────────────────────────────────────────────────────────────────────────────

const { validateList } = require('../dto/schemas')

// ── FSQ Food Category IDs → Cuisine mapping ──────────────────────────────────
// Reference: https://docs.foursquare.com/data-products/docs/categories
// Category 13000 = Dining & Drinking (parent), sub-categories map to cuisine
const FSQ_CUISINE_MAP = {
  // Fast food & quick service
  13145: 'Fast Food',
  13046: 'Fast Food',
  13306: 'Pizza',
  13064: 'Burger',
  13001: 'American',
  // Asian
  13072: 'Chinese',
  13075: 'Indian',
  13089: 'Japanese',
  13090: 'Korean',
  13099: 'Thai',
  13100: 'Vietnamese',
  13078: 'Indonesian',
  13094: 'Sri Lankan',
  13080: 'Nepali',
  // South Asian
  13055: 'South Indian',
  13056: 'North Indian',
  13063: 'Biryani',
  13310: 'Mughlai',
  // Western
  13010: 'Italian',
  13007: 'Mediterranean',
  13035: 'French',
  13002: 'Steakhouse',
  13022: 'Mexican',
  // Specialty
  13040: 'Seafood',
  13005: 'Bakery',
  13032: 'Dessert',
  13034: 'Ice Cream',
  13004: 'Bar',
  13038: 'Café',
  13050: 'Street Food',
  13284: 'Vegetarian',
  13285: 'Vegan',
  13300: 'Halal',
}

// FSQ features → dietary options
const DIETARY_FEATURE_MAP = {
  'Vegan': 'Vegan',
  'Vegetarian': 'Vegetarian',
  'Gluten-Free Options': 'Gluten-Free',
  'Halal': 'Halal',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract cuisine labels from FSQ categories array.
 * Falls back to category names if no specific mapping found.
 * @param {Array} categories
 * @returns {string[]}
 */
function extractCuisines(categories = []) {
  const cuisines = new Set()
  for (const cat of categories) {
    if (!cat?.id) continue
    // Direct map
    if (FSQ_CUISINE_MAP[cat.id]) {
      cuisines.add(FSQ_CUISINE_MAP[cat.id])
      continue
    }
    // Fallback: use short_name or name trimmed to 30 chars
    const name = cat.short_name || cat.name
    if (name && name.length <= 30) cuisines.add(name)
  }
  return [...cuisines].filter(Boolean)
}

/**
 * Extract dietary options from FSQ features or tastes.
 * @param {Object} place
 * @returns {string[]}
 */
function extractDietaryOptions(place) {
  const options = new Set()
  const features = place.features?.food_and_drink || {}
  const menus = place.features?.services?.dine_in || {}

  // Check structured feature flags
  if (features.vegan)      options.add('Vegan')
  if (features.vegetarian) options.add('Vegetarian')
  if (features.gluten_free_diet) options.add('Gluten-Free')

  // Check tastes array (free-form tags)
  const tastes = place.tastes || []
  for (const taste of tastes) {
    for (const [key, val] of Object.entries(DIETARY_FEATURE_MAP)) {
      if (taste.toLowerCase().includes(key.toLowerCase())) options.add(val)
    }
  }

  return [...options]
}

/**
 * Extract photo URLs from FSQ photos array.
 * Returns array of full image URLs at 400x300.
 * @param {Array} photos
 * @param {number} maxPhotos
 * @returns {string[]}
 */
function extractPhotos(photos = [], maxPhotos = 5) {
  return photos
    .slice(0, maxPhotos)
    .filter(p => p.prefix && p.suffix)
    .map(p => `${p.prefix}400x300${p.suffix}`)
}

/**
 * Parse FSQ opening hours into a structured format.
 * @param {Object} hours
 * @returns {{ display: string|null, isOpen: boolean|null, periods: Array }}
 */
function parseOpeningHours(hours) {
  if (!hours) return { display: null, isOpen: null, periods: [] }

  return {
    display:    hours.display || null,
    isOpen:     hours.open_now ?? null,
    periods:    hours.regular || [],
    openNowText: hours.open_now === true ? 'Open now' : hours.open_now === false ? 'Closed now' : null,
  }
}

/**
 * Map FSQ price level (1–4) to label and INR range.
 * @param {number} price
 * @returns {{ level: number, label: string, rangeINR: string }|null}
 */
function mapPriceLevel(price) {
  const map = {
    1: { level: 1, label: 'Budget',      rangeINR: 'Under ₹200' },
    2: { level: 2, label: 'Moderate',    rangeINR: '₹200–₹500' },
    3: { level: 3, label: 'Upscale',     rangeINR: '₹500–₹1500' },
    4: { level: 4, label: 'Fine Dining', rangeINR: 'Above ₹1500' },
  }
  return map[price] ?? null
}

/**
 * Calculate distance label for display (m or km).
 * @param {number|null} distanceM
 * @returns {string|null}
 */
function formatDistance(distanceM) {
  if (!distanceM) return null
  if (distanceM < 1000) return `${Math.round(distanceM)}m`
  return `${(distanceM / 1000).toFixed(1)}km`
}

// ── Main normaliser ───────────────────────────────────────────────────────────

/**
 * Normalise a single FSQ restaurant place result into NormalisedRestaurant.
 *
 * @param {Object} place — FSQ place result or detail object
 * @returns {NormalisedRestaurant | null}
 */
function normalise(place) {
  if (!place?.fsq_id || !place?.name) return null

  const geocode = place.geocodes?.main
  if (!geocode?.latitude || !geocode?.longitude) return null

  const photos       = extractPhotos(place.photos || [])
  const cuisines     = extractCuisines(place.categories)
  const dietary      = extractDietaryOptions(place)
  const openingHours = parseOpeningHours(place.hours)
  const priceInfo    = mapPriceLevel(place.price)

  // FSQ rating is 0–10; normalise to 0–5 (1dp)
  const rating = place.rating != null
    ? Math.round((place.rating / 2) * 10) / 10
    : null

  // Popularity: FSQ popularity is a 0–1 float; map to 0–100
  const popularityScore = place.popularity != null
    ? Math.round(place.popularity * 100)
    : null

  return {
    id:             `fsq:${place.fsq_id}`,
    fsqId:          place.fsq_id,
    source:         'Foursquare',
    name:           place.name,

    // Location
    coordinates:    { lat: geocode.latitude, lon: geocode.longitude },
    address:        place.location?.formatted_address
                    || [place.location?.address, place.location?.locality, place.location?.region]
                      .filter(Boolean).join(', ')
                    || null,
    city:           place.location?.locality
                    || place.location?.region
                    || place.location?.cross_street
                    || null,
    neighborhood:   place.location?.neighborhood?.[0] || null,

    // Cuisine & dietary
    cuisines,
    dietaryOptions: dietary,
    tastes:         (place.tastes || []).slice(0, 10),

    // Ratings & popularity
    rating,
    totalRatings:   place.stats?.total_ratings || null,
    totalPhotos:    place.stats?.total_photos  || null,
    popularityScore,

    // Price
    priceLevel:     place.price || null,
    priceTier:      place.price || 0,
    priceInfo,

    // Media
    photos,
    image:          photos[0] || null,
    photo:          photos[0] || null,

    // Hours
    openingHours,
    isOpenNow:      place.hours?.open_now ?? null,
    isOpen:         place.hours?.open_now ?? null,

    // Contact
    phone:          place.tel || null,
    website:        place.website || null,
    menu:           place.menu || null,

    // Distance
    distanceM:      place.distance || null,
    distanceLabel:  formatDistance(place.distance),

    // Description
    description:    place.description || null,

    // Meta
    verified:       place.verified || false,
    category:       cuisines.join(', ') || 'Restaurant',
    categories:     (place.categories || []).map(c => ({
      id:         c.id,
      name:       c.name,
      shortName:  c.short_name,
      icon:       c.icon ? `${c.icon.prefix}64${c.icon.suffix}` : null,
    })),
  }
}

/**
 * Normalise an array of FSQ restaurant results.
 * Deduplicates by fsq_id and filters results with missing coordinates.
 *
 * @param {Object[]} places
 * @returns {NormalisedRestaurant[]}
 */
function normaliseMany(places = []) {
  const seen   = new Set()
  const result = []

  for (const place of places) {
    if (!place?.fsq_id || seen.has(place.fsq_id)) continue
    seen.add(place.fsq_id)
    const normalised = normalise(place)
    if (normalised) result.push(normalised)
  }

  return validateList('Restaurant', result)
}

module.exports = {
  normalise,
  normaliseMany,
  extractCuisines,
  extractPhotos,
  parseOpeningHours,
  mapPriceLevel,
  formatDistance,
}
