// server/src/controllers/discover.controller.js
const Trip         = require('../models/Trip.model')
const { success }  = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')

// ── GET /api/v1/discover/feed ────────────────────────────────────────────

exports.getFeed = asyncHandler(async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 12, 50)
  const cursor = req.query.cursor  // lastCreatedAt for cursor pagination
  const sortBy = req.query.sortBy || 'latest'

  const query = { isPublic: true }
  if (cursor) query.createdAt = { $lt: new Date(cursor) }

  const sortOptions = {
    latest:  { createdAt: -1 },
    popular: { likesCount: -1, createdAt: -1 },
    saves:   { savesCount: -1, createdAt: -1 },
  }

  const trips = await Trip.find(query)
    .sort(sortOptions[sortBy] || sortOptions.latest)
    .limit(limit + 1)
    .populate('userId', 'name avatar')
    .lean()

  const hasMore   = trips.length > limit
  const feedTrips = hasMore ? trips.slice(0, limit) : trips
  const nextCursor = hasMore ? feedTrips[feedTrips.length - 1].createdAt.toISOString() : null

  const userId = req.user?._id
  const result = feedTrips.map(t => ({
    ...t,
    user:    t.userId,
    isLiked: userId ? t.likedBy?.some(id => id.equals(userId)) : false,
    isSaved: userId ? t.savedBy?.some(id => id.equals(userId)) : false,
  }))

  success(res, { trips: result, nextCursor, hasMore })
})

// ── GET /api/v1/discover/search ──────────────────────────────────────────

exports.search = asyncHandler(async (req, res) => {
  const { q, sortBy = 'latest' } = req.query
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)

  if (!q?.trim()) return success(res, { trips: [] })

  const trips = await Trip.find({
    isPublic: true,
    $or: [
      { destination: { $regex: q, $options: 'i' } },
      { source:      { $regex: q, $options: 'i' } },
      { tags:        { $in: [new RegExp(q, 'i')] } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name avatar')
    .lean()

  const userId = req.user?._id
  const result = trips.map(t => ({
    ...t,
    user:    t.userId,
    isLiked: userId ? t.likedBy?.some(id => id.equals(userId)) : false,
    isSaved: userId ? t.savedBy?.some(id => id.equals(userId)) : false,
  }))

  success(res, { trips: result })
})

// ── GET /api/v1/discover/trending ────────────────────────────────────────

exports.getTrending = asyncHandler(async (req, res) => {
  const results = await Trip.aggregate([
    { $match: { isPublic: true } },
    { $group: { _id: '$destination', count: { $sum: 1 }, totalLikes: { $sum: '$likesCount' } } },
    { $sort: { count: -1, totalLikes: -1 } },
    { $limit: 10 },
    { $project: { destination: '$_id', count: 1, totalLikes: 1, _id: 0 } },
  ])
  success(res, { destinations: results })
})
