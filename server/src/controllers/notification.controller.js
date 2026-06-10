// server/src/controllers/notification.controller.js
const Notification  = require('../models/Notification.model')
const { success }   = require('../utils/response')
const asyncHandler  = require('../utils/asyncHandler')

exports.getNotifications = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const skip  = (page - 1) * limit

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name avatar').lean(),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ])

  success(res, { notifications, unreadCount })
})

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { isRead: true })
  success(res, null, 'Marked as read')
})

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true })
  success(res, null, 'All marked as read')
})
