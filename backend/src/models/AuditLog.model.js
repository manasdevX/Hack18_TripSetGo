// server/src/models/AuditLog.model.js
const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action:    { type: String, required: true, index: true },
  status:    { type: String, enum: ['success', 'failure'], required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  details:   { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
})

// Auto-delete logs after 90 days (7776000 seconds) to conserve storage space
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
