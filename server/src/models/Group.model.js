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

module.exports = mongoose.model('Group', groupSchema)
