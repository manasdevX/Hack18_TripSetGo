// server/src/controllers/search.controller.js
const Hotel = require('../models/Hotel.model')
const Restaurant = require('../models/Restaurant.model')
const Attraction = require('../models/Attraction.model')
const { success } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// Escape special regex characters to prevent ReDoS on user-supplied input
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Helper for Pagination & Sorting
const getPaginationAndSort = (query) => {
  const page = parseInt(query.page, 10) || 1
  const limit = parseInt(query.limit, 10) || 10
  const skip = (page - 1) * limit

  let sort = { averageRating: -1 } // Default sort
  if (query.sort) {
    const sortField = query.sort.startsWith('-') ? query.sort.substring(1) : query.sort
    const sortOrder = query.sort.startsWith('-') ? -1 : 1
    sort = { [sortField]: sortOrder }
  }

  return { limit, skip, sort, page }
}

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

  if (type === 'hotels' || type === 'all') {
    results.hotels = await runQuery(Hotel, 'Hotel')
  }
  if (type === 'restaurants' || type === 'all') {
    results.restaurants = await runQuery(Restaurant, 'Restaurant')
  }
  if (type === 'attractions' || type === 'all') {
    results.attractions = await runQuery(Attraction, 'Attraction')
  }

  success(res, results)
})
