// server/src/controllers/search.controller.js
const Hotel      = require('../models/Hotel.model')
const Restaurant = require('../models/Restaurant.model')
const Attraction = require('../models/Attraction.model')
const { success, badRequest, error } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

const esService  = require('../services/elasticsearch.service')
const { INDICES } = esService

// ── Helpers ───────────────────────────────────────────────────────────────────

// Escape special regex characters to prevent ReDoS on user-supplied input
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Helper for Pagination & Sorting
const getPaginationAndSort = (query) => {
  const page  = parseInt(query.page, 10)  || 1
  const limit = parseInt(query.limit, 10) || 10
  const skip  = (page - 1) * limit

  let sort = { averageRating: -1 } // Default sort
  if (query.sort) {
    const sortField = query.sort.startsWith('-') ? query.sort.substring(1) : query.sort
    const sortOrder = query.sort.startsWith('-') ? -1 : 1
    sort = { [sortField]: sortOrder }
  }

  return { limit, skip, sort, page }
}

/**
 * Wrap an ES search call so that if Elasticsearch is unreachable the route
 * returns 503 rather than an unhandled 500.
 */
const safeES = async (res, fn) => {
  try {
    return await fn()
  } catch (err) {
    if (err?.meta?.statusCode === 503 || err?.code === 'ECONNREFUSED') {
      return error(res, 'Elasticsearch is not available. Please try again later.', 503)
    }
    throw err
  }
}

// ── MongoDB Routes (kept for backward compatibility) ──────────────────────────

exports.searchHotels = asyncHandler(async (req, res) => {
  const { search, city, minStar, minPrice, maxPrice } = req.query
  const { limit, skip, sort, page } = getPaginationAndSort(req.query)

  const match = {}
  if (search) match.$text = { $search: search }
  if (city) match.city = new RegExp(`^${escapeRegex(city)}$`, 'i')
  if (minStar) match.starRating = { $gte: Number(minStar) }
  if (minPrice || maxPrice) {
    match.priceLevel = {}
    if (minPrice) match.priceLevel.$gte = Number(minPrice)
    if (maxPrice) match.priceLevel.$lte = Number(maxPrice)
  }

  const [data, total] = await Promise.all([
    Hotel.find(match).sort(sort).skip(skip).limit(limit).lean(),
    Hotel.countDocuments(match)
  ])

  success(res, { data, total, page, pages: Math.ceil(total / limit) })
})

exports.searchRestaurants = asyncHandler(async (req, res) => {
  const { search, city, cuisine, diet, minPrice, maxPrice } = req.query
  const { limit, skip, sort, page } = getPaginationAndSort(req.query)

  const match = {}
  if (search) match.$text = { $search: search }
  if (city) match.city = new RegExp(`^${escapeRegex(city)}$`, 'i')
  if (cuisine) match.cuisines = new RegExp(`^${escapeRegex(cuisine)}$`, 'i')
  if (diet) match.dietaryOptions = new RegExp(`^${escapeRegex(diet)}$`, 'i')
  if (minPrice || maxPrice) {
    match.priceLevel = {}
    if (minPrice) match.priceLevel.$gte = Number(minPrice)
    if (maxPrice) match.priceLevel.$lte = Number(maxPrice)
  }

  const [data, total] = await Promise.all([
    Restaurant.find(match).sort(sort).skip(skip).limit(limit).lean(),
    Restaurant.countDocuments(match)
  ])

  success(res, { data, total, page, pages: Math.ceil(total / limit) })
})

exports.searchAttractions = asyncHandler(async (req, res) => {
  const { search, city, category } = req.query
  const { limit, skip, sort, page } = getPaginationAndSort(req.query)

  const match = {}
  if (search) match.$text = { $search: search }
  if (city) match.city = new RegExp(`^${escapeRegex(city)}$`, 'i')
  if (category) match.category = new RegExp(`^${escapeRegex(category)}$`, 'i')

  const [data, total] = await Promise.all([
    Attraction.find(match).sort(sort).skip(skip).limit(limit).lean(),
    Attraction.countDocuments(match)
  ])

  success(res, { data, total, page, pages: Math.ceil(total / limit) })
})

exports.searchCityOverview = asyncHandler(async (req, res) => {
  const { city } = req.params
  const match = { city: new RegExp(`^${escapeRegex(city)}$`, 'i') }

  // Fetch top 5 of each concurrently
  const [hotels, restaurants, attractions] = await Promise.all([
    Hotel.find(match).sort({ averageRating: -1 }).limit(5).lean(),
    Restaurant.find(match).sort({ averageRating: -1 }).limit(5).lean(),
    Attraction.find(match).sort({ averageRating: -1 }).limit(5).lean()
  ])

  success(res, { city, hotels, restaurants, attractions })
})

/**
 * GET /api/v1/search/nearby?lng=&lat=&radius=&type=&limit=
 * Returns all entities within a radius (km) of the given coordinates.
 * type can be: hotels | restaurants | attractions | all
 */
exports.searchNearby = asyncHandler(async (req, res) => {
  const { lng, lat, radius = 10, type = 'all', limit = 20 } = req.query

  if (!lng || !lat) {
    return res.status(400).json({ success: false, message: 'lng and lat are required' })
  }

  const lng_ = parseFloat(lng)
  const lat_ = parseFloat(lat)
  const radiusInRadians = parseFloat(radius) / 6371 // Earth radius in km

  const geoQuery = {
    location: {
      $geoWithin: {
        $centerSphere: [[lng_, lat_], radiusInRadians]
      }
    }
  }

  const lim = parseInt(limit, 10)

  const runQuery = async (Model, tag) =>
    (await Model.find(geoQuery).limit(lim).lean()).map(d => ({ ...d, _entityType: tag }))

  let results = {}

  if (type === 'hotels'      || type === 'all') results.hotels      = await runQuery(Hotel,      'Hotel')
  if (type === 'restaurants' || type === 'all') results.restaurants = await runQuery(Restaurant, 'Restaurant')
  if (type === 'attractions' || type === 'all') results.attractions = await runQuery(Attraction, 'Attraction')

  success(res, results)
})

// ── Elasticsearch Routes ──────────────────────────────────────────────────────

/**
 * GET /api/v1/search/es/hotels
 *
 * Query params:
 *   q          - Search string (full-text + optional fuzzy)
 *   fuzzy      - "true" to enable fuzziness
 *   city       - Filter by city (keyword)
 *   country    - Filter by country (keyword)
 *   minStar    - Filter by star rating (min)
 *   minPrice   - Filter by priceLevel (min)
 *   maxPrice   - Filter by priceLevel (max)
 *   amenity    - Filter by amenity tag
 *   sort       - rating | -rating | price | -price | newest
 *   page       - Page number (default: 1)
 *   limit      - Results per page (default: 10)
 */
exports.esSearchHotels = asyncHandler(async (req, res) => {
  const {
    q, fuzzy, city, country, minStar, minPrice, maxPrice, amenity,
    sort = 'relevance', page = 1, limit = 10,
  } = req.query

  const filters = {}
  if (city)     filters.city    = city
  if (country)  filters.country = country
  if (amenity)  filters.amenities = amenity

  if (minStar)              filters.starRating = { gte: Number(minStar) }
  if (minPrice || maxPrice) filters.priceLevel = {
    ...(minPrice ? { gte: Number(minPrice) } : {}),
    ...(maxPrice ? { lte: Number(maxPrice) } : {}),
  }

  return safeES(res, async () => {
    const result = await esService.fullTextSearch({
      index:  INDICES.hotels,
      query:  q || '',
      filters,
      fuzzy:  fuzzy === 'true',
      page:   Number(page),
      limit:  Number(limit),
      sort,
    })
    success(res, result)
  })
})

/**
 * GET /api/v1/search/es/restaurants
 *
 * Query params:
 *   q          - Search string
 *   fuzzy      - "true" to enable fuzziness
 *   city       - Filter by city
 *   cuisine    - Filter by cuisine tag(s) (comma-separated)
 *   diet       - Filter by dietary option (Vegan | Vegetarian | Gluten-Free | Halal)
 *   minPrice / maxPrice
 *   sort / page / limit
 */
exports.esSearchRestaurants = asyncHandler(async (req, res) => {
  const {
    q, fuzzy, city, cuisine, diet, minPrice, maxPrice,
    sort = 'relevance', page = 1, limit = 10,
  } = req.query

  const filters = {}
  if (city)    filters.city = city
  if (cuisine) filters.cuisines       = cuisine.split(',').map(s => s.trim())
  if (diet)    filters.dietaryOptions = diet

  if (minPrice || maxPrice) filters.priceLevel = {
    ...(minPrice ? { gte: Number(minPrice) } : {}),
    ...(maxPrice ? { lte: Number(maxPrice) } : {}),
  }

  return safeES(res, async () => {
    const result = await esService.fullTextSearch({
      index:  INDICES.restaurants,
      query:  q || '',
      filters,
      fuzzy:  fuzzy === 'true',
      page:   Number(page),
      limit:  Number(limit),
      sort,
    })
    success(res, result)
  })
})

/**
 * GET /api/v1/search/es/attractions
 *
 * Query params:
 *   q        - Search string
 *   fuzzy    - "true"
 *   city     - Filter by city
 *   category - Filter by category (Museum | Park | etc.)
 *   maxPrice - Filter by ticket price (lte)
 *   sort / page / limit
 */
exports.esSearchAttractions = asyncHandler(async (req, res) => {
  const {
    q, fuzzy, city, category, maxPrice,
    sort = 'relevance', page = 1, limit = 10,
  } = req.query

  const filters = {}
  if (city)     filters.city     = city
  if (category) filters.category = category
  if (maxPrice) filters.ticketPrice = { lte: Number(maxPrice) }

  return safeES(res, async () => {
    const result = await esService.fullTextSearch({
      index:  INDICES.attractions,
      query:  q || '',
      filters,
      fuzzy:  fuzzy === 'true',
      page:   Number(page),
      limit:  Number(limit),
      sort,
    })
    success(res, result)
  })
})

/**
 * GET /api/v1/search/es/reviews
 *
 * Query params:
 *   q          - Full-text search on review title + text
 *   targetType - Hotel | Restaurant | Attraction
 *   targetId   - MongoDB ObjectId of the reviewed entity
 *   minRating  - Minimum star rating
 *   verified   - "true" to only return verified visits
 *   sort / page / limit
 */
exports.esSearchReviews = asyncHandler(async (req, res) => {
  const {
    q, targetType, targetId, minRating, verified,
    sort = 'newest', page = 1, limit = 10,
  } = req.query

  const filters = {}
  if (targetType) filters.targetType = targetType
  if (targetId)   filters.targetId   = targetId
  if (verified === 'true') filters.isVerifiedVisit = true
  if (minRating)  filters.rating = { gte: Number(minRating) }

  return safeES(res, async () => {
    const result = await esService.fullTextSearch({
      index:  INDICES.reviews,
      query:  q || '',
      filters,
      fuzzy:  false,
      page:   Number(page),
      limit:  Number(limit),
      sort,
    })
    success(res, result)
  })
})

/**
 * GET /api/v1/search/es/autocomplete
 *
 * Live-typing suggestions — fast prefix search on the `name` field.
 *
 * Query params:
 *   q      - Partial input string (min 1 char)
 *   index  - hotels | restaurants | attractions (default: hotels)
 *   size   - Max suggestions (default: 8)
 */
exports.esAutocomplete = asyncHandler(async (req, res) => {
  const { q, index = 'hotels', size = 8 } = req.query

  if (!q || q.trim().length === 0) {
    return badRequest(res, 'Query parameter "q" is required')
  }

  const indexName = INDICES[index]
  if (!indexName) {
    return badRequest(res, `Invalid index. Must be one of: ${Object.keys(INDICES).join(', ')}`)
  }

  return safeES(res, async () => {
    const [prefixResults, completionResults] = await Promise.all([
      esService.autocomplete({ index: indexName, prefix: q, size: Number(size) }),
      esService.suggest({ index: indexName, text: q, size: Math.ceil(Number(size) / 2) }),
    ])

    // Merge, deduplicate by id, return autocomplete first then completions
    const seen = new Set()
    const merged = [...prefixResults, ...completionResults].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

    success(res, { suggestions: merged.slice(0, Number(size)) })
  })
})

/**
 * GET /api/v1/search/es/all
 *
 * Cross-index search across Hotels, Restaurants, and Attractions simultaneously.
 *
 * Query params:
 *   q      - Search string (required)
 *   fuzzy  - "true" to enable fuzziness
 *   size   - Results per index (default: 5)
 */
exports.esMultiSearch = asyncHandler(async (req, res) => {
  const { q, fuzzy, size = 5 } = req.query

  if (!q || q.trim().length === 0) {
    return badRequest(res, 'Query parameter "q" is required')
  }

  return safeES(res, async () => {
    const results = await esService.multiSearch({
      query: q,
      size:  Number(size),
      fuzzy: fuzzy === 'true',
    })
    success(res, results)
  })
})
