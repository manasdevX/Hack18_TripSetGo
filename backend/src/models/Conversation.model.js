// server/src/models/Conversation.model.js
const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  type:         { type: String, enum: ['direct', 'group', 'ai_assistant'], default: 'direct' },
  tripId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', sparse: true }, // Optional link to a group trip
  lastMessage: {
    text:     { type: String },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt:   { type: Date }
  }
}, { timestamps: true })

module.exports = mongoose.model('Conversation', conversationSchema)
