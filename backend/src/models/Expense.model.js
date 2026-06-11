// server/src/models/Expense.model.js
const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0 },
  currency:    { type: String, default: 'INR' },
  paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitAmong:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category:    { type: String, enum: ['accommodation', 'food', 'transport', 'entertainment', 'misc'], default: 'misc' },
  note:        { type: String, default: '' },
  receiptUrl:  { type: String, default: null },
}, { timestamps: true })

module.exports = mongoose.model('Expense', expenseSchema)
