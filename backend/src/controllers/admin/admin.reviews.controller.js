const Review = require('../../models/Review.model')
const Hotel = require('../../models/Hotel.model')
const Restaurant = require('../../models/Restaurant.model')
const Attraction = require('../../models/Attraction.model')
const AuditLog = require('../../models/AuditLog.model')
const { success, notFound } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.getReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit
  const reportedOnly = req.query.reported === 'true'
  const minRating = parseInt(req.query.rating) || 0

  const query = {}
  if (reportedOnly) query['reportedBy.0'] = { $exists: true }
  if (minRating > 0) query.rating = { $gte: minRating }

  const [reviews, total] = await Promise.all([
    Review.find(query).populate('userId', 'name email avatar').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(query),
  ])

  return success(res, {
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

exports.deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params
  const review = await Review.findById(id)
  if (!review) return notFound(res, 'Review not found')

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

  await AuditLog.create({
    userId: req.user._id,
    action: 'ADMIN_DELETE_REVIEW',
    status: 'success',
    details: { reviewId: id }
  })

  return success(res, null, 'Review deleted successfully')
})
