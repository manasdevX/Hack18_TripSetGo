// server/src/controllers/admin.controller.js
const User = require('../models/User.model')
const Review = require('../models/Review.model')
const Trip = require('../models/Trip.model')
const Hotel = require('../models/Hotel.model')
const Restaurant = require('../models/Restaurant.model')
const Attraction = require('../models/Attraction.model')
const Subscription = require('../models/Subscription.model')
const AuditLog = require('../models/AuditLog.model')
const UserActivity = require('../models/UserActivity.model')
const { success, error, badRequest, notFound } = require('../utils/response')

// ── 1. Analytics & Dashboard Stats ──────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    // Basic counts
    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ status: 'active' })
    const suspendedUsers = await User.countDocuments({ status: 'suspended' })

    const totalTrips = await Trip.countDocuments()
    const publicTrips = await Trip.countDocuments({ isPublic: true })
    const privateTrips = totalTrips - publicTrips

    const totalReviews = await Review.countDocuments()
    
    // Destinations counts
    const totalHotels = await Hotel.countDocuments()
    const totalRestaurants = await Restaurant.countDocuments()
    const totalAttractions = await Attraction.countDocuments()
    const totalDestinations = totalHotels + totalRestaurants + totalAttractions

    // Subscriptions
    const activeSubscriptions = await Subscription.countDocuments({ isActive: true })
    const proUsers = await User.countDocuments({ plan: 'pro' })

    // Estimated monthly revenue = active Pro subscribers × the Pro plan price (₹499/mo).
    const PRO_MONTHLY_PRICE_INR = 499
    const estimatedMonthlyRevenue = proUsers * PRO_MONTHLY_PRICE_INR

    // Recent activity trends (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Daily Signups for the last 7 days
    const signupsTrend = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Daily Trips for the last 7 days
    const tripsTrend = await Trip.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Daily Reviews for the last 7 days
    const reviewsTrend = await Review.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Popular destinations (most searched or viewed in UserActivity in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const popularDestinations = await UserActivity.aggregate([
      { $match: { action: { $in: ['view', 'search'] }, timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$metadata.destination', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])

    return success(res, {
      stats: {
        users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
        trips: { total: totalTrips, public: publicTrips, private: privateTrips },
        reviews: { total: totalReviews },
        destinations: { total: totalDestinations, hotels: totalHotels, restaurants: totalRestaurants, attractions: totalAttractions },
        subscriptions: { active: activeSubscriptions, proUsers, estimatedMonthlyRevenue }
      },
      trends: {
        signups: signupsTrend,
        trips: tripsTrend,
        reviews: reviewsTrend,
        popularDestinations
      }
    })
  } catch (err) {
    return error(res, err.message)
  }
}

// ── 2. User Management ───────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const search = req.query.search || ''
    const role = req.query.role || ''
    const status = req.query.status || ''

    const query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    if (role) query.role = role
    if (status) query.status = status

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await User.countDocuments(query)

    return success(res, {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    return error(res, err.message)
  }
}

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return badRequest(res, 'Invalid status value')
    }

    const user = await User.findById(id)
    if (!user) return notFound(res, 'User not found')

    user.status = status
    await user.save()

    // Add Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_UPDATE_USER_STATUS`,
      status: 'success',
      details: { targetUserId: id, newStatus: status }
    })

    return success(res, user, 'User status updated successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['user', 'admin'].includes(role)) {
      return badRequest(res, 'Invalid role value')
    }

    const user = await User.findById(id)
    if (!user) return notFound(res, 'User not found')

    user.role = role
    await user.save()

    // Add Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_UPDATE_USER_ROLE`,
      status: 'success',
      details: { targetUserId: id, newRole: role }
    })

    return success(res, user, 'User role updated successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) return notFound(res, 'User not found')

    // Clean delete or soft delete
    user.status = 'deleted'
    await user.save()

    // Add Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_DELETE_USER`,
      status: 'success',
      details: { targetUserId: id }
    })

    return success(res, null, 'User soft-deleted successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

// ── 3. Review Management ─────────────────────────────────────────────────────
exports.getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const reportedOnly = req.query.reported === 'true'
    const minRating = parseInt(req.query.rating) || 0

    const query = {}
    if (reportedOnly) {
      query['reportedBy.0'] = { $exists: true } // Has at least one reporter
    }
    if (minRating > 0) {
      query.rating = { $gte: minRating }
    }

    const reviews = await Review.find(query)
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Review.countDocuments(query)

    return success(res, {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    return error(res, err.message)
  }
}

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params
    const review = await Review.findById(id)
    if (!review) return notFound(res, 'Review not found')

    // Find the place model to update average rating and reviewCount
    let Model
    if (review.targetType === 'Hotel') Model = Hotel
    else if (review.targetType === 'Restaurant') Model = Restaurant
    else if (review.targetType === 'Attraction') Model = Attraction

    if (Model) {
      const place = await Model.findById(review.targetId)
      if (place) {
        const remainingReviews = await Review.find({ 
          _id: { $ne: review._id }, 
          targetId: review.targetId, 
          targetType: review.targetType 
        })
        const newReviewCount = remainingReviews.length
        const totalRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0)
        place.reviewCount = newReviewCount
        place.averageRating = newReviewCount > 0 ? (totalRating / newReviewCount) : 0
        await place.save()
      }
    }

    await review.deleteOne()

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_DELETE_REVIEW`,
      status: 'success',
      details: { reviewId: id }
    })

    return success(res, null, 'Review deleted successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

// ── 4. Destination Management ────────────────────────────────────────────────
exports.getDestinations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const search = req.query.search || ''
    const type = req.query.type || 'all' // hotel, restaurant, attraction, all

    let destinations = []
    let total = 0

    const query = {}
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }

    if (type === 'hotel' || type === 'all') {
      const hotels = await Hotel.find(query).lean()
      destinations = destinations.concat(hotels.map(h => ({ ...h, type: 'Hotel' })))
    }
    if (type === 'restaurant' || type === 'all') {
      const restaurants = await Restaurant.find(query).lean()
      destinations = destinations.concat(restaurants.map(r => ({ ...r, type: 'Restaurant' })))
    }
    if (type === 'attraction' || type === 'all') {
      const attractions = await Attraction.find(query).lean()
      destinations = destinations.concat(attractions.map(a => ({ ...a, type: 'Attraction' })))
    }

    // Sort by name
    destinations.sort((a, b) => a.name.localeCompare(b.name))
    total = destinations.length

    // Paginate in memory
    const paginated = destinations.slice(skip, skip + limit)

    return success(res, {
      destinations: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    return error(res, err.message)
  }
}

exports.createDestination = async (req, res) => {
  try {
    const { type, name, description, address, city, country, coordinates, starRating, priceLevel, cuisines, category, ticketPrice, recommendedDuration, amenities } = req.body

    if (!type || !['Hotel', 'Restaurant', 'Attraction'].includes(type)) {
      return badRequest(res, 'Invalid destination type')
    }

    let result
    const locationData = {
      type: 'Point',
      coordinates: coordinates || [0, 0] // [longitude, latitude]
    }

    if (type === 'Hotel') {
      result = await Hotel.create({
        name, description, address, city, country, location: locationData, starRating, priceLevel, amenities: amenities || []
      })
    } else if (type === 'Restaurant') {
      result = await Restaurant.create({
        name, cuisines: cuisines || [], address, city, location: locationData, priceLevel
      })
    } else if (type === 'Attraction') {
      result = await Attraction.create({
        name, category, description, city, location: locationData, ticketPrice: ticketPrice || 0, recommendedDuration: recommendedDuration || 60
      })
    }

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_CREATE_DESTINATION`,
      status: 'success',
      details: { destinationId: result._id, type }
    })

    return success(res, result, 'Destination created successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

exports.updateDestination = async (req, res) => {
  try {
    const { type, id } = req.params
    const updateData = req.body

    let Model
    if (type === 'Hotel') Model = Hotel
    else if (type === 'Restaurant') Model = Restaurant
    else if (type === 'Attraction') Model = Attraction
    else return badRequest(res, 'Invalid destination type')

    const destination = await Model.findById(id)
    if (!destination) return notFound(res, 'Destination not found')

    // Handle updates
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        destination[key] = updateData[key]
      }
    })

    await destination.save()

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_UPDATE_DESTINATION`,
      status: 'success',
      details: { destinationId: id, type }
    })

    return success(res, destination, 'Destination updated successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

exports.deleteDestination = async (req, res) => {
  try {
    const { type, id } = req.params

    let Model
    if (type === 'Hotel') Model = Hotel
    else if (type === 'Restaurant') Model = Restaurant
    else if (type === 'Attraction') Model = Attraction
    else return badRequest(res, 'Invalid destination type')

    const destination = await Model.findById(id)
    if (!destination) return notFound(res, 'Destination not found')

    await Model.deleteOne({ _id: id })

    // Also delete any reviews for this target
    await Review.deleteMany({ targetId: id, targetType: type })

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `ADMIN_DELETE_DESTINATION`,
      status: 'success',
      details: { destinationId: id, type }
    })

    return success(res, null, 'Destination deleted successfully')
  } catch (err) {
    return error(res, err.message)
  }
}

// ── 5. System Reports & Audit Logs ──────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const auditLogs = await AuditLog.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)

    const total = await AuditLog.countDocuments()

    return success(res, {
      auditLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    return error(res, err.message)
  }
}

exports.exportUsersCSV = async (req, res) => {
  try {
    const users = await User.find().select('name email role plan status createdAt').lean()
    
    // Construct CSV
    let csv = 'Name,Email,Role,Plan,Status,JoinedDate\n'
    users.forEach(u => {
      csv += `"${u.name}","${u.email}","${u.role}","${u.plan}","${u.status}","${u.createdAt.toISOString()}"\n`
    })

    res.header('Content-Type', 'text/csv')
    res.attachment('users_report.csv')
    return res.send(csv)
  } catch (err) {
    return error(res, err.message)
  }
}
