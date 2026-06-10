// server/src/models/Bookmark.model.js
const mongoose = require('mongoose')

const bookmarkSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['Hotel', 'Restaurant', 'Attraction', 'Trip'], required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetType' },
  folderName: { type: String, default: 'Saved' } // e.g., "Paris 2026", "Bucket List"
}, { timestamps: true })

// Indexes
// Prevent duplicate saves of the same item
bookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true })
// For fetching all user's bookmarks within a specific folder
bookmarkSchema.index({ userId: 1, folderName: 1 })

module.exports = mongoose.model('Bookmark', bookmarkSchema)
