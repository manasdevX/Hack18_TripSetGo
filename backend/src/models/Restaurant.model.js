// server/src/models/Restaurant.model.js
const mongoose = require('mongoose')

const restaurantSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  cuisines:       [{ type: String, index: true }],
  location: {
    type:         { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates:  { type: [Number], required: true } // [longitude, latitude]
  },
  address:        { type: String, required: true },
  city:           { type: String, required: true, index: true },
  priceLevel:     { type: Number, min: 1, max: 4 },
  dietaryOptions: [{ type: String, enum: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal'] }],
  averageRating:  { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:    { type: Number, default: 0 },
  images:         [{ type: String }]
}, { timestamps: true })

// Indexes
restaurantSchema.index({ location: '2dsphere' })
restaurantSchema.index({ city: 1, cuisines: 1, averageRating: -1 })
restaurantSchema.index({ name: 'text' })

module.exports = mongoose.model('Restaurant', restaurantSchema)
