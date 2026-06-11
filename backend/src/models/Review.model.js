// server/src/models/Review.model.js
const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType:      { type: String, enum: ['Hotel', 'Restaurant', 'Attraction'], required: true },
  targetId:        { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetType' },
  rating:          { type: Number, required: true, min: 1, max: 5 },
  title:           { type: String, trim: true, maxlength: 100 },
  text:            { type: String, trim: true, maxlength: 2000 },
  photos:          [{ type: String }],
  upvotes:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reportedBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isVerifiedVisit: { type: Boolean, default: false }
}, { timestamps: true })

// Indexes
// For fetching reviews of a specific place, sorted by newest
reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })
// Ensure a user can only review an item once
reviewSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)
