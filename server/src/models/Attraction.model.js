// server/src/models/Attraction.model.js
const mongoose = require('mongoose')

const attractionSchema = new mongoose.Schema({
  name:                { type: String, required: true, trim: true },
  category:            { type: String, required: true, index: true }, // e.g., Museum, Park
  description:         { type: String },
  location: {
    type:              { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates:       { type: [Number], required: true } // [longitude, latitude]
  },
  city:                { type: String, required: true, index: true },
  recommendedDuration: { type: Number }, // in minutes
  ticketPrice:         { type: Number, default: 0 },
  averageRating:       { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:         { type: Number, default: 0 },
  images:              [{ type: String }]
}, { timestamps: true })

// Indexes
attractionSchema.index({ location: '2dsphere' })
attractionSchema.index({ city: 1, category: 1 })
attractionSchema.index({ name: 'text' })

module.exports = mongoose.model('Attraction', attractionSchema)
