// server/src/controllers/copilot.controller.js
// TripSetGo Copilot — a context-aware travel assistant. Replies stream over SSE
// and the conversation is persisted (Conversation type 'ai_assistant' + Messages
// tagged role 'user'/'assistant') so history survives reloads.
const Conversation = require('../models/Conversation.model')
const Message      = require('../models/Message.model')
const Trip         = require('../models/Trip.model')
const { copilotReplyStream, copilotReply } = require('../services/gemini.service')
const asyncHandler = require('../utils/asyncHandler')
const { success, notFound } = require('../utils/response')
const logger       = require('../utils/logger')
const { sanitizeText } = require('../utils/sanitizer')

const HISTORY_LIMIT = 12

function buildSystemPrompt({ user, trip, recentTrips }) {
  const lines = [
    'You are TripSetGo Copilot, an expert and friendly AI travel assistant for an Indian travel-planning app.',
    'Help the user plan and refine trips: suggest destinations, attractions, restaurants and hidden gems, optimise budgets, explain costs, build day-wise plans, and adjust itineraries on request.',
    'Be concise, practical and specific. Show prices in Indian Rupees (₹). Prefer short paragraphs or tight bullet lists.',
    'Never claim to make real bookings or payments. If you lack a detail, ask one short clarifying question.',
  ]
  if (user?.name) lines.push(`The user's name is ${user.name}.`)
  if (trip) {
    lines.push(
      `CURRENT TRIP: ${trip.source} → ${trip.destination}, ${trip.numTravelers} traveller(s), total budget ₹${trip.budget}, ` +
      `dates ${new Date(trip.startDate).toDateString()} to ${new Date(trip.endDate).toDateString()}.`
    )
    const days = trip.planData?.meta?.total_days
    if (days) lines.push(`The current plan spans ${days} days.`)
    if (trip.preferences?.length) lines.push(`Trip preferences: ${trip.preferences.join(', ')}.`)
  }
  if (recentTrips?.length) {
    lines.push(`The user has recently planned trips to: ${recentTrips.map((t) => t.destination).join(', ')}.`)
  }
  return lines.join('\n')
}

// POST /api/v1/copilot/chat  → Server-Sent Events stream
exports.streamChat = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const message = sanitizeText(String(req.body.message || '')).trim()
  if (!message) return res.status(400).json({ success: false, message: 'message is required' })
  if (message.length > 2000) return res.status(400).json({ success: false, message: 'message too long (max 2000 characters)' })

  const requestedTripId = req.body.tripId || null

  // Resolve (or create) the AI conversation for this user.
  let conversation = null
  if (req.body.conversationId) {
    conversation = await Conversation.findOne({ _id: req.body.conversationId, participants: userId, type: 'ai_assistant' })
  }
  if (!conversation) {
    conversation = await Conversation.create({ participants: [userId], type: 'ai_assistant', tripId: requestedTripId })
  }

  // Ground on the user's own trip only.
  let trip = null
  const tripId = conversation.tripId || requestedTripId
  if (tripId) {
    trip = await Trip.findById(tripId).select('source destination startDate endDate budget numTravelers preferences planData userId')
    if (trip && !trip.userId.equals(userId)) trip = null
  }
  const recentTrips = await Trip.find({ userId }).sort({ createdAt: -1 }).limit(3).select('destination')

  // Recent history (chronological) + the new message.
  const prior = await Message.find({ conversationId: conversation._id }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean()
  const history = prior.reverse().map((m) => ({ role: m.role || 'user', text: m.text }))
  history.push({ role: 'user', text: message })

  await Message.create({ conversationId: conversation._id, senderId: userId, role: 'user', text: message })

  // ── SSE setup ──
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable proxy buffering (nginx/Render)
  if (res.flushHeaders) res.flushHeaders()
  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
    if (res.flush) res.flush() // flush through the compression middleware
  }

  send({ type: 'meta', conversationId: conversation._id })

  const system = buildSystemPrompt({ user: req.user, trip, recentTrips })
  let full = ''
  try {
    for await (const token of copilotReplyStream({ system, history })) {
      full += token
      send({ type: 'token', text: token })
    }
  } catch (err) {
    logger.warn(`[Copilot] stream failed, falling back to non-stream: ${err.message}`)
    try {
      full = await copilotReply({ system, history })
      send({ type: 'token', text: full })
    } catch (err2) {
      logger.error(`[Copilot] reply failed: ${err2.message}`)
      send({ type: 'error', message: 'The copilot is unavailable right now. Please try again in a moment.' })
      return res.end()
    }
  }

  if (full.trim()) {
    await Message.create({ conversationId: conversation._id, senderId: userId, role: 'assistant', text: full })
    conversation.lastMessage = { text: full.slice(0, 200), senderId: userId, sentAt: new Date() }
    await conversation.save()
  }

  send({ type: 'done', conversationId: conversation._id })
  res.end()
})

// GET /api/v1/copilot/conversations
exports.listConversations = asyncHandler(async (req, res) => {
  const convos = await Conversation.find({ participants: req.user._id, type: 'ai_assistant' })
    .sort({ updatedAt: -1 })
    .limit(30)
    .populate('tripId', 'destination')
    .lean()
  success(res, convos, 'Conversations fetched')
})

// GET /api/v1/copilot/conversations/:id/messages
exports.getMessages = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, participants: req.user._id, type: 'ai_assistant' })
  if (!convo) return notFound(res, 'Conversation not found')
  const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 }).limit(200).lean()
  success(res, { conversation: convo, messages }, 'Messages fetched')
})

// DELETE /api/v1/copilot/conversations/:id
exports.deleteConversation = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, participants: req.user._id, type: 'ai_assistant' })
  if (!convo) return notFound(res, 'Conversation not found')
  await Message.deleteMany({ conversationId: convo._id })
  await convo.deleteOne()
  success(res, { _id: convo._id }, 'Conversation deleted')
})
