// server/src/models/Hotel.model.js
const mongoose = require('mongoose')

const hotelSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  description:   { type: String, required: true },
  location: {
    type:        { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address:       { type: String, required: true },
  city:          { type: String, required: true, index: true },
  country:       { type: String, required: true, index: true },
  starRating:    { type: Number, min: 1, max: 5 },
  priceLevel:    { type: Number, min: 1, max: 4 }, // 1: Cheap, 4: Luxury
  amenities:     [{ type: String }],
  images:        [{ type: String }],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:   { type: Number, default: 0 }
}, { timestamps: true })

// Indexes
hotelSchema.index({ location: '2dsphere' })
hotelSchema.index({ city: 1, averageRating: -1 })
hotelSchema.index({ name: 'text', city: 'text' })

module.exports = mongoose.model('Hotel', hotelSchema)
