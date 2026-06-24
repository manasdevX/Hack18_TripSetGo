const User = require('../../models/User.model')
const Review = require('../../models/Review.model')
const Trip = require('../../models/Trip.model')
const Hotel = require('../../models/Hotel.model')
const Restaurant = require('../../models/Restaurant.model')
const Attraction = require('../../models/Attraction.model')
const Subscription = require('../../models/Subscription.model')
const UserActivity = require('../../models/UserActivity.model')
const { success } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.getAnalytics = asyncHandler(async (req, res) => {
  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers, activeUserCount, suspendedUsers,
    totalTrips, publicTrips,
    totalReviews,
    totalHotels, totalRestaurants, totalAttractions,
    activeSubscriptions, proUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'suspended' }),
    Trip.countDocuments(),
    Trip.countDocuments({ isPublic: true }),
    Review.countDocuments(),
    Hotel.countDocuments(),
    Restaurant.countDocuments(),
    Attraction.countDocuments(),
    Subscription.countDocuments({ isActive: true }),
    User.countDocuments({ plan: 'pro' }),
  ])

  const privateTrips = totalTrips - publicTrips
  const totalDestinations = totalHotels + totalRestaurants + totalAttractions
  const PRO_MONTHLY_PRICE_INR = 499
  const estimatedMonthlyRevenue = proUsers * PRO_MONTHLY_PRICE_INR

  const trendPipeline = (collection, matchDate) => [
    { $match: { createdAt: { $gte: matchDate } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]

  const [signupsTrend, tripsTrend, reviewsTrend, popularDestinations] = await Promise.all([
    User.aggregate(trendPipeline(User, sevenDaysAgo)),
    Trip.aggregate(trendPipeline(Trip, sevenDaysAgo)),
    Review.aggregate(trendPipeline(Review, sevenDaysAgo)),
    UserActivity.aggregate([
      { $match: { action: { $in: ['view', 'search'] }, timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$metadata.destination', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ])

  return success(res, {
    stats: {
      users:         { total: totalUsers, active: activeUserCount, suspended: suspendedUsers },
      trips:         { total: totalTrips, public: publicTrips, private: privateTrips },
      reviews:       { total: totalReviews },
      destinations:  { total: totalDestinations, hotels: totalHotels, restaurants: totalRestaurants, attractions: totalAttractions },
      subscriptions: { active: activeSubscriptions, proUsers, estimatedMonthlyRevenue },
    },
    trends: { signups: signupsTrend, trips: tripsTrend, reviews: reviewsTrend, popularDestinations },
  })
})
