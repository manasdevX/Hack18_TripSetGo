// server/src/controllers/review.controller.js
const Review = require('../models/Review.model')
const Hotel = require('../models/Hotel.model')
const Restaurant = require('../models/Restaurant.model')
const Attraction = require('../models/Attraction.model')
const { success, notFound, badRequest } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { uploadImageBuffer } = require('../services/cloudinary.service')

// Helper to recalculate average rating for a target
const recalculateAverageRating = async (targetType, targetId) => {
  const result = await Review.aggregate([
    { $match: { targetType, targetId: targetId } },
    { $group: { _id: '$targetId', avgRating: { $avg: '$rating' }, nRatings: { $sum: 1 } } }
  ])

  const stats = result.length > 0 ? result[0] : { avgRating: 0, nRatings: 0 }
  
  let Model;
  if (targetType === 'Hotel') Model = Hotel
  else if (targetType === 'Restaurant') Model = Restaurant
  else if (targetType === 'Attraction') Model = Attraction

  if (Model) {
    await Model.findByIdAndUpdate(targetId, {
      averageRating: Math.round(stats.avgRating * 10) / 10,
      reviewCount: stats.nRatings
    })
  }
}

exports.addReview = asyncHandler(async (req, res) => {
  const { targetType, targetId, rating, title, text } = req.body

  // Check for existing review
  const existing = await Review.findOne({ userId: req.user._id, targetType, targetId })
  if (existing) return badRequest(res, 'You have already reviewed this place')

  const review = await Review.create({
    userId: req.user._id, targetType, targetId, rating, title, text
  })

  await recalculateAverageRating(targetType, targetId)
  success(res, review, 'Review created successfully', 201)
})

exports.editReview = asyncHandler(async (req, res) => {
  const { rating, title, text } = req.body
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { rating, title, text },
    { new: true, runValidators: true }
  )

  if (!review) return notFound(res, 'Review not found or unauthorized')
  
  await recalculateAverageRating(review.targetType, review.targetId)
  success(res, review, 'Review updated')
})

exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!review) return notFound(res, 'Review not found or unauthorized')

  await recalculateAverageRating(review.targetType, review.targetId)
  success(res, null, 'Review deleted')
})

exports.uploadReviewImages = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, userId: req.user._id })
  if (!review) return notFound(res, 'Review not found or unauthorized')

  if (!req.files || req.files.length === 0) return badRequest(res, 'No images provided')

  const uploadPromises = req.files.map(file => uploadImageBuffer(file.buffer, 'tripsetgo/reviews'))
  const urls = await Promise.all(uploadPromises)

  review.photos.push(...urls)
  await review.save()

  success(res, review, 'Images uploaded successfully')
})

exports.toggleHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
  if (!review) return notFound(res, 'Review not found')

  const isHelpful = review.upvotes.includes(req.user._id)
  if (isHelpful) {
    review.upvotes.pull(req.user._id)
  } else {
    review.upvotes.push(req.user._id)
  }

  await review.save()
  success(res, { isHelpful: !isHelpful, upvotesCount: review.upvotes.length }, isHelpful ? 'Helpful vote removed' : 'Helpful vote added')
})

exports.reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
  if (!review) return notFound(res, 'Review not found')

  if (!review.reportedBy.includes(req.user._id)) {
    review.reportedBy.push(req.user._id)
    await review.save()
  }

  success(res, null, 'Review reported successfully')
})

exports.getTargetReviews = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    Review.find({ targetType, targetId })
          .populate('userId', 'name avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
    Review.countDocuments({ targetType, targetId })
  ])

  success(res, { reviews, total, page, pages: Math.ceil(total / limit) })
})
