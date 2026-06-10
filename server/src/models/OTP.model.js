// server/src/models/OTP.model.js
const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  otp:       { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

// TTL index: MongoDB will automatically delete documents 10 minutes (600 seconds) after createdAt
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 })

module.exports = mongoose.model('OTP', otpSchema)
