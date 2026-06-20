// server/src/models/Group.model.js
const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  tripId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currency:  { type: String, default: 'INR' },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true })

// getMyGroups filters by `$or: [{ ownerId }, { members }]` — index both so the
// expense-group list stays fast as the collection grows.
groupSchema.index({ ownerId: 1 })
groupSchema.index({ members: 1 })

module.exports = mongoose.model('Group', groupSchema)
