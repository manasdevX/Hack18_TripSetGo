// server/src/models/Message.model.js
const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:           { type: String, required: true },
  readBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })

// Index to fetch paginated messages sorted by time
messageSchema.index({ conversationId: 1, createdAt: -1 })

module.exports = mongoose.model('Message', messageSchema)
