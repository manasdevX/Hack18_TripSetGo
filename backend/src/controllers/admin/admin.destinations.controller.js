const Hotel = require('../../models/Hotel.model')
const Restaurant = require('../../models/Restaurant.model')
const Attraction = require('../../models/Attraction.model')
const Review = require('../../models/Review.model')
const AuditLog = require('../../models/AuditLog.model')
const { success, badRequest, notFound } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.getDestinations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit
  const search = req.query.search || ''
  const type = req.query.type || 'all'

  const query = {}
  if (search) query.name = { $regex: search, $options: 'i' }

  const [hotels, restaurants, attractions] = await Promise.all([
    (type === 'hotel'      || type === 'all') ? Hotel.find(query).lean()      : [],
    (type === 'restaurant' || type === 'all') ? Restaurant.find(query).lean() : [],
    (type === 'attraction' || type === 'all') ? Attraction.find(query).lean() : [],
  ])

  let destinations = [
    ...hotels.map(h => ({ ...h, type: 'Hotel' })),
    ...restaurants.map(r => ({ ...r, type: 'Restaurant' })),
    ...attractions.map(a => ({ ...a, type: 'Attraction' })),
  ]
  destinations.sort((a, b) => a.name.localeCompare(b.name))
  const total = destinations.length
  const paginated = destinations.slice(skip, skip + limit)

  return success(res, {
    destinations: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

exports.createDestination = asyncHandler(async (req, res) => {
  const { type, name, description, address, city, country, coordinates, starRating, priceLevel, cuisines, category, ticketPrice, recommendedDuration, amenities } = req.body

  if (!type || !['Hotel', 'Restaurant', 'Attraction'].includes(type)) {
    return badRequest(res, 'Invalid destination type')
  }

  let result
  const locationData = { type: 'Point', coordinates: coordinates || [0, 0] }

  if (type === 'Hotel') {
    result = await Hotel.create({ name, description, address, city, country, location: locationData, starRating, priceLevel, amenities: amenities || [] })
  } else if (type === 'Restaurant') {
    result = await Restaurant.create({ name, cuisines: cuisines || [], address, city, location: locationData, priceLevel })
  } else if (type === 'Attraction') {
    result = await Attraction.create({ name, category, description, city, location: locationData, ticketPrice: ticketPrice || 0, recommendedDuration: recommendedDuration || 60 })
  }

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_CREATE_DESTINATION',
    status: 'success',
    details: { destinationId: result._id, type }
  })

  return success(res, result, 'Destination created successfully')
})

exports.updateDestination = asyncHandler(async (req, res) => {
  const { type, id } = req.params
  const updateData = req.body

  let Model
  if (type === 'Hotel') Model = Hotel
  else if (type === 'Restaurant') Model = Restaurant
  else if (type === 'Attraction') Model = Attraction
  else return badRequest(res, 'Invalid destination type')

  const destination = await Model.findById(id)
  if (!destination) return notFound(res, 'Destination not found')

  Object.keys(updateData).forEach(key => {
    if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
      destination[key] = updateData[key]
    }
  })

  await destination.save()

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_UPDATE_DESTINATION',
    status: 'success',
    details: { destinationId: id, type }
  })

  return success(res, destination, 'Destination updated successfully')
})

exports.deleteDestination = asyncHandler(async (req, res) => {
  const { type, id } = req.params

  let Model
  if (type === 'Hotel') Model = Hotel
  else if (type === 'Restaurant') Model = Restaurant
  else if (type === 'Attraction') Model = Attraction
  else return badRequest(res, 'Invalid destination type')

  const destination = await Model.findById(id)
  if (!destination) return notFound(res, 'Destination not found')

  await Promise.all([
    Model.deleteOne({ _id: id }),
    Review.deleteMany({ targetId: id, targetType: type }),
  ])

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_DELETE_DESTINATION',
    status: 'success',
    details: { destinationId: id, type }
  })

  return success(res, null, 'Destination deleted successfully')
})
