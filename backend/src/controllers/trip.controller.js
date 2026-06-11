// server/src/controllers/trip.controller.js
const mongoose     = require('mongoose')
const Trip         = require('../models/Trip.model')
const Subscription = require('../models/Subscription.model')
const Notification = require('../models/Notification.model')
const { generateTripPlan } = require('../services/gemini.service')
const fallback     = require('../planning/fallbackPlanner')
const { success, created, notFound, badRequest, forbidden, unauthorized } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const logger       = require('../utils/logger')

// ── POST /api/v1/trips — Generate AI trip plan ───────────────────────────

exports.createTrip = asyncHandler(async (req, res) => {
  const { source, destination, startDate, endDate, budget, numTravelers, groupType, preferences } = req.body
  if (!source || !destination || !startDate || !endDate || !budget) {
    return badRequest(res, 'source, destination, startDate, endDate and budget are required')
  }

  // Enforce subscription search limit
  const subscription = await Subscription.findOne({ userId: req.user._id })
  if (subscription && !subscription.canSearch()) {
    return res.status(429).json({ success: false, message: `Daily limit reached (${subscription.getSearchLimit()} plans/day). Upgrade to Pro for unlimited plans.` })
  }

  const tripData = { source, destination, startDate, endDate, budget: Number(budget), numTravelers: Number(numTravelers) || 1, groupType: groupType || 'solo', preferences: preferences || [] }

  // Try Gemini first, fallback to deterministic engine
  let planData = await generateTripPlan(tripData)
  let usedFallback = false

  if (!planData) {
    logger.warn(`⚠️ Gemini failed — using deterministic fallback for ${destination}`)
    planData = fallback.generatePlan(tripData)
    usedFallback = true
  }

  const tags = [
    destination.toLowerCase(),
    ...(planData.meta?.tags || []),
    ...(preferences || []).slice(0, 3),
  ].filter(Boolean)

  const trip = await Trip.create({
    userId: req.user._id,
    ...tripData,
    planData,
    tags,
    isPublic: false,
    usedFallback,
  })

  // Update usage counter
  if (subscription) {
    subscription.checkAndResetDaily()
    subscription.searchesToday += 1
    subscription.lastSearchDate = new Date()
    await subscription.save()
  }

  // Increment user trip count
  req.user.tripsCount = (req.user.tripsCount || 0) + 1
  await req.user.save()

  logger.info(`✅ Trip created: ${destination} (${usedFallback ? 'fallback' : 'Gemini'}) for user ${req.user._id}`)
  created(res, { plan: planData, tripId: trip._id, usedFallback }, 'Trip plan generated')
})

// ── GET /api/v1/trips/my-trips ───────────────────────────────────────────

exports.getMyTrips = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip  = (page - 1) * limit

  const [trips, total] = await Promise.all([
    Trip.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Trip.countDocuments({ userId: req.user._id }),
  ])

  const tripsWithFlags = trips.map(t => ({
    ...t,
    isLiked: t.likedBy?.some(id => id.equals(req.user._id)),
    isSaved: t.savedBy?.some(id => id.equals(req.user._id)),
  }))

  success(res, { trips: tripsWithFlags, total, page, hasMore: skip + trips.length < total })
})

// ── GET /api/v1/trips/:id ────────────────────────────────────────────────

exports.getTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate('userId', 'name avatar')
  if (!trip) return notFound(res, 'Trip not found')

  // Route uses optionalAuth — req.user may be undefined (guest viewing a shared link)
  const userId = req.user?._id
  const isOwner = userId && trip.userId?._id?.equals(userId)
  if (!trip.isPublic && !isOwner) {
    return userId ? forbidden(res) : unauthorized(res, 'This trip is private')
  }

  success(res, {
    ...trip.toObject(),
    isLiked: userId ? trip.likedBy.some(id => id.equals(userId)) : false,
    isSaved: userId ? trip.savedBy.some(id => id.equals(userId)) : false,
  })
})

// ── PUT /api/v1/trips/:id — Update selections ───────────────────────────

exports.updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  if (req.body.selections) trip.selectedOptions = req.body.selections
  if (req.body.isPublic !== undefined) trip.isPublic = req.body.isPublic
  await trip.save()

  success(res, trip)
})

// ── DELETE /api/v1/trips/:id ─────────────────────────────────────────────

exports.deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')
  req.user.tripsCount = Math.max(0, (req.user.tripsCount || 0) - 1)
  await req.user.save()
  success(res, null, 'Trip deleted')
})

// ── POST /api/v1/trips/:id/like ──────────────────────────────────────────

exports.likeTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const userId  = req.user._id
  const isLiked = trip.likedBy.some(id => id.equals(userId))

  if (isLiked) {
    trip.likedBy.pull(userId)
    trip.likesCount = Math.max(0, trip.likesCount - 1)
  } else {
    trip.likedBy.push(userId)
    trip.likesCount += 1
    // Notify trip owner
    if (!trip.userId.equals(userId)) {
      await Notification.create({ userId: trip.userId, type: 'like', message: `${req.user.name} liked your trip to ${trip.destination}`, actor: userId, meta: { tripId: trip._id } })
    }
  }
  await trip.save()
  success(res, { likesCount: trip.likesCount, isLiked: !isLiked })
})

// ── POST /api/v1/trips/:id/save ──────────────────────────────────────────

exports.saveTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const userId  = req.user._id
  const isSaved = trip.savedBy.some(id => id.equals(userId))

  if (isSaved) { trip.savedBy.pull(userId); trip.savesCount = Math.max(0, trip.savesCount - 1) }
  else          { trip.savedBy.push(userId); trip.savesCount += 1 }

  await trip.save()
  success(res, { savesCount: trip.savesCount, isSaved: !isSaved })
})

// ── POST /api/v1/trips/:id/comment ──────────────────────────────────────

exports.addComment = asyncHandler(async (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return badRequest(res, 'Comment text is required')

  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const comment = { userId: req.user._id, user: { name: req.user.name, avatar: req.user.avatar }, text: text.trim(), createdAt: new Date() }
  trip.comments.push(comment)
  trip.commentsCount = trip.comments.length
  await trip.save()

  success(res, trip.comments[trip.comments.length - 1], 'Comment added')
})

// ── POST /api/v1/trips/:id/clone ────────────────────────────────────────

exports.cloneTrip = asyncHandler(async (req, res) => {
  const original = await Trip.findById(req.params.id)
  if (!original) return notFound(res, 'Trip not found')
  if (!original.isPublic && !original.userId.equals(req.user._id)) return forbidden(res)

  const clone = await Trip.create({
    userId:      req.user._id,
    source:      original.source,
    destination: original.destination,
    startDate:   original.startDate,
    endDate:     original.endDate,
    budget:      original.budget,
    numTravelers: original.numTravelers,
    groupType:   original.groupType,
    preferences: original.preferences,
    tags:        original.tags,
    planData:    original.planData,
    clonedFrom:  original._id,
    isPublic:    false,
  })

  original.cloneCount += 1
  await original.save()
  req.user.tripsCount += 1
  await req.user.save()

  created(res, clone, 'Trip cloned')
})

// ── POST /api/v1/trips/:id/share — Generate shareable public link ────────

exports.shareTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  // Make the trip public so the link is accessible
  if (!trip.isPublic) {
    trip.isPublic = true
    await trip.save()
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
  const shareUrl  = `${clientUrl}/trips/${trip._id}`

  success(res, { shareUrl, isPublic: true }, 'Trip is now public and shareable')
})

// ── PUT /api/v1/trips/:id/itinerary — Save full itinerary ───────────────

exports.saveItinerary = asyncHandler(async (req, res) => {
  const { itinerary } = req.body
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  trip.itinerary = itinerary
  await trip.save()

  success(res, trip, 'Itinerary saved successfully')
})

// ── POST /api/v1/trips/:id/itinerary/day — Add a day to itinerary ───────

exports.addItineraryDay = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  const { day, date, activities } = req.body

  // Prevent duplicate day numbers
  const existing = trip.itinerary.find(d => d.day === day)
  if (existing) return badRequest(res, `Day ${day} already exists in your itinerary. Use PUT to update it.`)

  trip.itinerary.push({ day, date, activities: activities || [] })
  trip.itinerary.sort((a, b) => a.day - b.day) // Keep sorted by day
  await trip.save()

  success(res, trip, `Day ${day} added to itinerary`)
})

// ── PUT /api/v1/trips/:id/itinerary/day/:day — Update a specific day ────

exports.updateItineraryDay = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  const dayNum = parseInt(req.params.day, 10)
  const dayEntry = trip.itinerary.find(d => d.day === dayNum)
  if (!dayEntry) return notFound(res, `Day ${dayNum} not found in itinerary`)

  if (req.body.date       !== undefined) dayEntry.date       = req.body.date
  if (req.body.activities !== undefined) dayEntry.activities = req.body.activities

  trip.markModified('itinerary')
  await trip.save()

  success(res, trip, `Day ${dayNum} updated`)
})

// ── DELETE /api/v1/trips/:id/itinerary/day/:day — Remove a specific day ─

exports.deleteItineraryDay = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  const dayNum = parseInt(req.params.day, 10)
  const index  = trip.itinerary.findIndex(d => d.day === dayNum)
  if (index === -1) return notFound(res, `Day ${dayNum} not found in itinerary`)

  trip.itinerary.splice(index, 1)
  await trip.save()

  success(res, trip, `Day ${dayNum} removed from itinerary`)
})
