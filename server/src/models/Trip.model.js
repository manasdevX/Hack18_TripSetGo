// server/src/models/Trip.model.js
const mongoose = require('mongoose')

const tripSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source:       { type: String, required: true, trim: true },
  destination:  { type: String, required: true, trim: true, index: true },
  startDate:    { type: Date, required: true },
  endDate:      { type: Date, required: true },
  budget:       { type: Number, required: true },
  numTravelers: { type: Number, required: true, min: 1, max: 50 },
  groupType:    { type: String, enum: ['solo', 'couple', 'family', 'friends', 'business'], default: 'solo' },
  preferences:  [{ type: String }],
  tags:         [{ type: String }],

  // Full plan from Gemini / fallback engine
  planData:     { type: mongoose.Schema.Types.Mixed, default: null },

  // User's chosen options
  selectedOptions: {
    transport:  { type: mongoose.Schema.Types.Mixed, default: null },
    hotel:      { type: mongoose.Schema.Types.Mixed, default: null },
    food:       { type: mongoose.Schema.Types.Mixed, default: null },
    activities: [{ type: mongoose.Schema.Types.Mixed }],
  },

  // TripAdvisor-like relational itinerary
  itinerary: [{
    day:  { type: Number, required: true },
    date: { type: Date },
    activities: [{
      targetType: { type: String, enum: ['Attraction', 'Restaurant', 'Hotel', 'Custom'] },
      targetId:   { type: mongoose.Schema.Types.ObjectId, refPath: 'itinerary.activities.targetType' },
      notes:      { type: String, maxlength: 1000 },
      startTime:  { type: Date }
    }]
  }],

  isPublic:      { type: Boolean, default: false, index: true },
  usedFallback:  { type: Boolean, default: false },
  likesCount:    { type: Number, default: 0 },
  savesCount:    { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  cloneCount:    { type: Number, default: 0 },
  clonedFrom:   { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },

  // Cached likes/saves arrays for O(1) checks
  likedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

tripSchema.index({ destination: 'text', tags: 'text' })
tripSchema.index({ isPublic: 1, createdAt: -1 })
tripSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Trip', tripSchema)
