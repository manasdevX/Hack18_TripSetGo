// server/src/validators/expense.validator.js
const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const createGroupSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(80).required(),
    tripId: objectId.optional().allow(null, ''),
    memberEmails: Joi.array().items(Joi.string().email()).max(20).optional(),
    currency: Joi.string().trim().uppercase().max(8).optional(),
  }).required(),
}

const addMemberSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }).required(),
}

const addExpenseSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(120).required(),
    amount: Joi.number().positive().max(1e9).required(),
    category: Joi.string().valid('accommodation', 'food', 'transport', 'entertainment', 'misc').optional(),
    paidBy: objectId.required(),
    splitAmong: Joi.array().items(objectId).min(1).required(),
    note: Joi.string().trim().max(500).optional().allow(''),
  }).required(),
}

module.exports = {
  createGroupSchema,
  addMemberSchema,
  addExpenseSchema,
}
