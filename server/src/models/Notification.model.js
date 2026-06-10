// server/src/models/Notification.model.js
const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    { type: String, enum: ['like', 'comment', 'follow', 'clone', 'system', 'subscription'], required: true },
  message: { type: String, required: true },
  isRead:  { type: Boolean, default: false, index: true },
  meta:    { type: mongoose.Schema.Types.Mixed, default: {} },  // tripId, actorId, etc.
  actor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
