// server/src/models/Payment.model.js
// Tracks every individual payment attempt — success, failure, or pending.
// Provides payment history per user and idempotency enforcement via the
// unique index on razorpayPaymentId.
const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  razorpayOrderId: {
    type:     String,
    required: true,
    index:    true,
  },
  // Unique on paymentId — enforces idempotency at DB level.
  // A second verifyPayment call with the same paymentId will hit a duplicate-key
  // error before any business logic runs.
  razorpayPaymentId: {
    type:   String,
    unique: true,
    sparse: true,  // null entries allowed (for pending/failed orders)
    index:  true,
  },
  planId: {
    type: String,
    enum: ['free', 'pro'],
    required: true,
  },
  amount: {
    type:     Number,  // in paise (e.g. 49900 = ₹499)
    required: true,
  },
  currency: {
    type:    String,
    default: 'INR',
  },
  status: {
    type:    String,
    enum:    ['pending', 'captured', 'failed', 'refunded'],
    default: 'pending',
    index:   true,
  },
  // ISO timestamp of when Razorpay confirmed the capture
  capturedAt: {
    type: Date,
    default: null,
  },
  failureReason: {
    type:    String,
    default: null,
  },
  // Webhook delivery tracking
  webhookReceived: {
    type:    Boolean,
    default: false,
  },
  webhookEvent: {
    type:    String,
    default: null,
  },
}, { timestamps: true })

// Compound index for fast per-user history queries
paymentSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Payment', paymentSchema)
