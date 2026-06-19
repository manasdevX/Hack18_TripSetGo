// server/src/controllers/trip.controller.js
const mongoose     = require('mongoose')
const Trip         = require('../models/Trip.model')
const User         = require('../models/User.model')
const Subscription = require('../models/Subscription.model')
const Notification = require('../models/Notification.model')
const { generateTripPlan } = require('../services/gemini.service')
const fallback     = require('../planning/fallbackPlanner')
const cacheService = require('../services/cache.service')
const { logActivity } = require('../services/recommendation.service')
const notifService = require('../services/notification.service')
const { success, created, notFound, badRequest, forbidden, unauthorized } = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const logger       = require('../utils/logger')
const { sanitizeComment } = require('../utils/sanitizer')
const { withTransaction } = require('../utils/transaction')

// ── POST /api/v1/trips — Generate AI trip plan ───────────────────────────

exports.createTrip = asyncHandler(async (req, res) => {
  const { source, destination, startDate, endDate, budget, numTravelers, groupType, preferences } = req.body
  if (!source || !destination || !startDate || !endDate || !budget) {
    return badRequest(res, 'source, destination, startDate, endDate and budget are required')
  }

  // Enforce subscription search limit (check outside transaction)
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

  // Use transaction for multi-document consistency
  const { trip, user: updatedUser } = await withTransaction(async (session) => {
    const trip = await Trip.create([{
      userId: req.user._id,
      ...tripData,
      planData,
      tags,
      isPublic: false,
      usedFallback,
    }], { session })

    // Update subscription usage counter
    if (subscription) {
      subscription.checkAndResetDaily()
      subscription.searchesToday += 1
      subscription.lastSearchDate = new Date()
      await subscription.save({ session })
    }

    // Increment user trip count
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { tripsCount: 1 } },
      { session, new: true }
    )

    return { trip: trip[0], user }
  })

  logger.info(`✅ Trip created: ${destination} (${usedFallback ? 'fallback' : 'Gemini'}) for user ${req.user._id}`)

  // Invalidate feed + trending caches — a new trip affects public discovery
  cacheService.flushMany('destinations:feed', 'destinations:trending').catch((err) =>
    logger.warn(`[Cache] Feed/trending invalidation failed: ${err.message}`)
  )

  // Log trip_create activity for recommendation engine (fire-and-forget)
  logActivity(req.user._id, 'trip_create', null, null, {
    destination,
    source,
    groupType: groupType || 'solo',
    budget:    Number(budget),
  })

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
  const trip = await Trip.findById(req.params.id)
    .populate('userId', 'name avatar')
    .populate('collaborators.userId', 'name email avatar')
  if (!trip) return notFound(res, 'Trip not found')

  // Route uses optionalAuth — req.user may be undefined (guest viewing a shared link)
  const userId = req.user?._id
  const isOwner = userId && trip.userId?._id?.equals(userId)
  const isCollaborator = userId && trip.collaborators.some(c => c.userId?._id?.equals(userId) && c.status === 'accepted')
  
  if (!trip.isPublic && !isOwner && !isCollaborator) {
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
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const isOwner = trip.userId.equals(req.user._id)
  const isEditor = trip.collaborators.some(c => c.userId.equals(req.user._id) && c.status === 'accepted' && c.role === 'editor')

  if (!isOwner && !isEditor) {
    return forbidden(res, 'You do not have permission to edit this trip')
  }

  if (req.body.selections) trip.selectedOptions = req.body.selections
  if (req.body.isPublic !== undefined && isOwner) trip.isPublic = req.body.isPublic
  await trip.save()

  // Notify socket room
  req.io.to(`trip_room:${trip._id}`).emit('itinerary_updated', { tripId: trip._id })

  success(res, trip)
})

// ── DELETE /api/v1/trips/:id ─────────────────────────────────────────────

exports.deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')
  if (!trip.userId.equals(req.user._id)) {
    return forbidden(res, 'Only the trip owner can delete this trip')
  }

  await Trip.findByIdAndDelete(req.params.id)
  req.user.tripsCount = Math.max(0, (req.user.tripsCount || 0) - 1)
  await req.user.save()

  // Invalidate feed + trending caches if this was a public trip
  if (trip.isPublic) {
    cacheService.flushMany('destinations:feed', 'destinations:trending').catch((err) =>
      logger.warn(`[Cache] Feed/trending invalidation on delete failed: ${err.message}`)
    )
  }

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

  // Sanitize comment text to prevent XSS
  const sanitizedText = sanitizeComment(text.trim())
  
  const comment = { userId: req.user._id, user: { name: req.user.name, avatar: req.user.avatar }, text: sanitizedText, createdAt: new Date() }
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

  // Log trip_clone activity for recommendation engine (fire-and-forget)
  logActivity(req.user._id, 'trip_clone', 'Trip', original._id, {
    destination: original.destination,
  })

  created(res, clone, 'Trip cloned')
})

// ── POST /api/v1/trips/:id/share — Generate shareable public link ────────

exports.shareTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id })
  if (!trip) return notFound(res, 'Trip not found')

  const wasAlreadyPublic = trip.isPublic

  // Make the trip public so the link is accessible
  if (!wasAlreadyPublic) {
    trip.isPublic = true
    await trip.save()
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
  const shareUrl  = `${clientUrl}/trips/${trip._id}`

  // Trip is now public — invalidate discovery caches
  if (!wasAlreadyPublic) {
    cacheService.flushMany('destinations:feed', 'destinations:trending').catch((err) =>
      logger.warn(`[Cache] Feed/trending invalidation on share failed: ${err.message}`)
    )

    // ── Notification: trip_shared ────────────────────────────────────────
    // Notify all accepted collaborators (fire-and-forget, never blocks response)
    notifService.notifyTripShared({
      trip,
      actor:       req.user,
      shareUrl,
      io:          req.io,
      activeUsers: req.activeUsers,
    }).catch((err) => logger.warn(`[Notif] trip_shared dispatch error: ${err.message}`))
  }

  success(res, { shareUrl, isPublic: true }, 'Trip is now public and shareable')
})

// ── PUT /api/v1/trips/:id/itinerary — Save full itinerary ───────────────

exports.saveItinerary = asyncHandler(async (req, res) => {
  const { itinerary } = req.body
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const isOwner = trip.userId.equals(req.user._id)
  const isEditor = trip.collaborators.some(c => c.userId.equals(req.user._id) && c.status === 'accepted' && c.role === 'editor')
  if (!isOwner && !isEditor) {
    return forbidden(res, 'You do not have permission to edit this trip')
  }

  trip.itinerary = itinerary
  await trip.save()

  // Notify socket room (real-time collaborative editing)
  req.io.to(`trip_room:${trip._id}`).emit('itinerary_updated', { tripId: trip._id })

  // ── Notification: itinerary_updated ──────────────────────────────────
  notifService.notifyItineraryUpdated({
    trip,
    actor:       req.user,
    changeDesc:  'Full itinerary replaced',
    io:          req.io,
    activeUsers: req.activeUsers,
  }).catch((err) => logger.warn(`[Notif] itinerary_updated dispatch error: ${err.message}`))

  success(res, trip, 'Itinerary saved successfully')
})

// ── POST /api/v1/trips/:id/itinerary/day — Add a day to itinerary ───────

exports.addItineraryDay = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const isOwner = trip.userId.equals(req.user._id)
  const isEditor = trip.collaborators.some(c => c.userId.equals(req.user._id) && c.status === 'accepted' && c.role === 'editor')
  if (!isOwner && !isEditor) {
    return forbidden(res, 'You do not have permission to edit this trip')
  }

  const { day, date, activities } = req.body

  // Prevent duplicate day numbers
  const existing = trip.itinerary.find(d => d.day === day)
  if (existing) return badRequest(res, `Day ${day} already exists in your itinerary. Use PUT to update it.`)

  trip.itinerary.push({ day, date, activities: activities || [] })
  trip.itinerary.sort((a, b) => a.day - b.day) // Keep sorted by day
  await trip.save()

  // Notify socket room (real-time collaborative editing)
  req.io.to(`trip_room:${trip._id}`).emit('itinerary_updated', { tripId: trip._id })

  // ── Notification: itinerary_updated ──────────────────────────────────
  notifService.notifyItineraryUpdated({
    trip,
    actor:       req.user,
    changeDesc:  `Day ${day} added to the itinerary`,
    io:          req.io,
    activeUsers: req.activeUsers,
  }).catch((err) => logger.warn(`[Notif] itinerary_updated dispatch error: ${err.message}`))

  success(res, trip, `Day ${day} added to itinerary`)
})

// ── PUT /api/v1/trips/:id/itinerary/day/:day — Update a specific day ────

exports.updateItineraryDay = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const isOwner = trip.userId.equals(req.user._id)
  const isEditor = trip.collaborators.some(c => c.userId.equals(req.user._id) && c.status === 'accepted' && c.role === 'editor')
  if (!isOwner && !isEditor) {
    return forbidden(res, 'You do not have permission to edit this trip')
  }

  const dayNum = parseInt(req.params.day, 10)
  const dayEntry = trip.itinerary.find(d => d.day === dayNum)
  if (!dayEntry) return notFound(res, `Day ${dayNum} not found in itinerary`)

  if (req.body.date       !== undefined) dayEntry.date       = req.body.date
  if (req.body.activities !== undefined) dayEntry.activities = req.body.activities

  trip.markModified('itinerary')
  await trip.save()

  // Notify socket room (real-time collaborative editing)
  req.io.to(`trip_room:${trip._id}`).emit('itinerary_updated', { tripId: trip._id })

  // ── Notification: itinerary_updated ──────────────────────────────────
  notifService.notifyItineraryUpdated({
    trip,
    actor:       req.user,
    changeDesc:  `Day ${dayNum} updated`,
    io:          req.io,
    activeUsers: req.activeUsers,
  }).catch((err) => logger.warn(`[Notif] itinerary_updated dispatch error: ${err.message}`))

  success(res, trip, `Day ${dayNum} updated`)
})

// ── DELETE /api/v1/trips/:id/itinerary/day/:day — Remove a specific day ─

exports.deleteItineraryDay = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const isOwner = trip.userId.equals(req.user._id)
  const isEditor = trip.collaborators.some(c => c.userId.equals(req.user._id) && c.status === 'accepted' && c.role === 'editor')
  if (!isOwner && !isEditor) {
    return forbidden(res, 'You do not have permission to edit this trip')
  }

  const dayNum = parseInt(req.params.day, 10)
  const index  = trip.itinerary.findIndex(d => d.day === dayNum)
  if (index === -1) return notFound(res, `Day ${dayNum} not found in itinerary`)

  trip.itinerary.splice(index, 1)
  await trip.save()

  // Notify socket room
  req.io.to(`trip_room:${trip._id}`).emit('itinerary_updated', { tripId: trip._id })

  success(res, trip, `Day ${dayNum} removed from itinerary`)
})

// ── Collaboration endpoints ─────────────────────────────────────────────

exports.inviteCollaborator = asyncHandler(async (req, res) => {
  const { email, role } = req.body
  if (!email?.trim()) return badRequest(res, 'Email is required')

  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  // Only the trip owner can invite collaborators
  if (!trip.userId.equals(req.user._id)) {
    return forbidden(res, 'Only the trip owner can invite collaborators')
  }

  // Find user by email
  const invitee = await User.findOne({ email: email.trim().toLowerCase() })
  if (!invitee) return notFound(res, `User with email ${email} not found`)

  // Check if trying to invite self
  if (invitee._id.equals(req.user._id)) {
    return badRequest(res, 'You cannot invite yourself as a collaborator')
  }

  // Check if already a collaborator
  const exists = trip.collaborators.some(c => c.userId.equals(invitee._id))
  if (exists) {
    return badRequest(res, 'This user is already invited or a collaborator on this trip')
  }

  // Add collaborator
  trip.collaborators.push({
    userId: invitee._id,
    role: role || 'editor',
    status: 'pending'
  })
  await trip.save()

  // Create notification for invitee
  const notification = await Notification.create({
    userId: invitee._id,
    type: 'trip_invite',
    message: `${req.user.name} invited you to collaborate on the trip to ${trip.destination}`,
    actor: req.user._id,
    meta: { tripId: trip._id }
  })

  // Emit real-time notification via Socket.io
  const socketId = req.activeUsers.get(invitee._id.toString())
  if (socketId) {
    req.io.to(socketId).emit('notification', {
      _id: notification._id,
      userId: invitee._id,
      type: 'trip_invite',
      message: `${req.user.name} invited you to collaborate on the trip to ${trip.destination}`,
      actor: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
      meta: { tripId: trip._id },
      createdAt: notification.createdAt
    })
  }

  // Populate and return updated collaborators
  const updatedTrip = await Trip.findById(trip._id).populate('collaborators.userId', 'name email avatar')
  success(res, updatedTrip.collaborators, 'Collaborator invited successfully')
})

exports.respondToInvitation = asyncHandler(async (req, res) => {
  const { accept } = req.body
  if (accept === undefined) return badRequest(res, 'accept (boolean) parameter is required')

  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  // Find user in collaborators list
  const index = trip.collaborators.findIndex(c => c.userId.equals(req.user._id))
  if (index === -1) return forbidden(res, 'You are not invited to collaborate on this trip')

  const collaborator = trip.collaborators[index]
  if (collaborator.status !== 'pending') {
    return badRequest(res, 'You have already responded to this invitation')
  }

  if (accept) {
    collaborator.status = 'accepted'
  } else {
    trip.collaborators.splice(index, 1)
  }

  await trip.save()

  // Notify owner
  const statusText = accept ? 'accepted' : 'declined'
  const notification = await Notification.create({
    userId: trip.userId,
    type: 'system',
    message: `${req.user.name} has ${statusText} your invitation to collaborate on the trip to ${trip.destination}`,
    actor: req.user._id,
    meta: { tripId: trip._id }
  })

  const ownerSocketId = req.activeUsers.get(trip.userId.toString())
  if (ownerSocketId) {
    req.io.to(ownerSocketId).emit('notification', {
      _id: notification._id,
      userId: trip.userId,
      type: 'system',
      message: `${req.user.name} has ${statusText} your invitation to collaborate on the trip to ${trip.destination}`,
      actor: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
      meta: { tripId: trip._id },
      createdAt: notification.createdAt
    })
  }

  success(res, { status: collaborator.status }, `Invitation ${statusText}`)
})

exports.removeCollaborator = asyncHandler(async (req, res) => {
  const { userId } = req.params
  const trip = await Trip.findById(req.params.id)
  if (!trip) return notFound(res, 'Trip not found')

  const isOwner = trip.userId.equals(req.user._id)
  const isSelf = req.user._id.equals(userId)

  // Only the owner can remove someone, or a collaborator can remove/leave themselves
  if (!isOwner && !isSelf) {
    return forbidden(res, 'You do not have permission to remove this collaborator')
  }

  const index = trip.collaborators.findIndex(c => c.userId.equals(userId))
  if (index === -1) return notFound(res, 'Collaborator not found on this trip')

  trip.collaborators.splice(index, 1)
  await trip.save()

  // Notify the removed user if they were removed by owner
  if (isOwner && !isSelf) {
    const notification = await Notification.create({
      userId: userId,
      type: 'system',
      message: `You were removed from collaborating on the trip to ${trip.destination}`,
      actor: req.user._id,
      meta: { tripId: trip._id }
    })

    const removeeSocketId = req.activeUsers.get(userId.toString())
    if (removeeSocketId) {
      req.io.to(removeeSocketId).emit('notification', {
        _id: notification._id,
        userId: userId,
        type: 'system',
        message: `You were removed from collaborating on the trip to ${trip.destination}`,
        actor: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
        meta: { tripId: trip._id },
        createdAt: notification.createdAt
      })
    }
  }

  success(res, null, 'Collaborator removed successfully')
})

exports.getSharedTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    'collaborators.userId': req.user._id
  })
    .populate('userId', 'name avatar')
    .populate('collaborators.userId', 'name email avatar')
    .sort({ createdAt: -1 })
    .lean()

  const tripsWithFlags = trips.map(t => ({
    ...t,
    isLiked: t.likedBy?.some(id => id.equals(req.user._id)),
    isSaved: t.savedBy?.some(id => id.equals(req.user._id)),
  }))

  success(res, tripsWithFlags)
})
