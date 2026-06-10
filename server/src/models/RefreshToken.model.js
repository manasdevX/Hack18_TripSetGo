// server/src/models/RefreshToken.model.js
const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token:     { type: String, required: true, unique: true },
  jti:       { type: String, required: true },       // JWT ID — for single-use enforcement
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
}, { timestamps: true })

// TTL index: auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('RefreshToken', refreshTokenSchema)
