// server/src/models/Subscription.model.js
const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan:              { type: String, enum: ['free', 'pro'], default: 'free' },
  isActive:          { type: Boolean, default: false },
  startDate:         { type: Date, default: null },
  endDate:           { type: Date, default: null },
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },
  searchesToday:     { type: Number, default: 0 },
  lastSearchDate:    { type: Date, default: null },
}, { timestamps: true })

// Reset daily usage
subscriptionSchema.methods.checkAndResetDaily = function () {
  const today = new Date().toDateString()
  if (!this.lastSearchDate || new Date(this.lastSearchDate).toDateString() !== today) {
    this.searchesToday = 0
    this.lastSearchDate = new Date()
  }
}

subscriptionSchema.methods.getSearchLimit = function () {
  return this.plan === 'pro' ? Infinity : 5
}

subscriptionSchema.methods.canSearch = function () {
  this.checkAndResetDaily()
  return this.searchesToday < this.getSearchLimit()
}

module.exports = mongoose.model('Subscription', subscriptionSchema)
