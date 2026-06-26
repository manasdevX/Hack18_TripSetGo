// server/src/controllers/notification.controller.js
const Notification  = require('../models/Notification.model')
const { success, notFound, badRequest } = require('../utils/response')
const asyncHandler  = require('../utils/asyncHandler')

// ── GET /api/v1/notifications ────────────────────────────────────────────────
// Returns paginated notifications for the authenticated user, newest first.
// Includes unread count in the response for badge display.

exports.getNotifications = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1)
  const limit = Math.min(50, parseInt(req.query.limit) || 20)
  const skip  = (page - 1) * limit

  // Optional filter: ?type=trip_shared,new_review
  const typeFilter = req.query.type
    ? { type: { $in: req.query.type.split(',').map((t) => t.trim()) } }
    : {}

  // Optional filter: ?unread=true
  const unreadFilter = req.query.unread === 'true' ? { isRead: false } : {}

  const query = { userId: req.user._id, ...typeFilter, ...unreadFilter }

  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name avatar')
      .lean(),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
    Notification.countDocuments(query),
  ])

  success(res, {
    notifications,
    unreadCount,
    total,
    page,
    hasMore: skip + notifications.length < total,
  })
})

// ── PUT /api/v1/notifications/:id/read ───────────────────────────────────────
// Mark a single notification as read.

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { returnDocument: 'after' }
  )
  if (!notification) return notFound(res, 'Notification not found')
  success(res, notification, 'Marked as read')
})

// ── PUT /api/v1/notifications/read-all ───────────────────────────────────────
// Mark ALL unread notifications for the user as read.

exports.markAllRead = asyncHandler(async (req, res) => {
  const { modifiedCount } = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  )
  success(res, { modifiedCount }, `${modifiedCount} notification(s) marked as read`)
})

// ── DELETE /api/v1/notifications/:id ─────────────────────────────────────────
// Delete a single notification (the user can dismiss individual items).

exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  })
  if (!notification) return notFound(res, 'Notification not found')
  success(res, null, 'Notification deleted')
})

// ── DELETE /api/v1/notifications ─────────────────────────────────────────────
// Clear ALL notifications for the authenticated user.

exports.clearAll = asyncHandler(async (req, res) => {
  const { deletedCount } = await Notification.deleteMany({ userId: req.user._id })
  success(res, { deletedCount }, `${deletedCount} notification(s) cleared`)
})

// ── GET /api/v1/notifications/summary ────────────────────────────────────────
// Lightweight endpoint for navbar badge polling (only unread count + latest 5).

exports.getSummary = asyncHandler(async (req, res) => {
  const [unreadCount, recent] = await Promise.all([
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('actor', 'name avatar')
      .lean(),
  ])
  success(res, { unreadCount, recent })
})
