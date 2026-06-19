// server/src/validators/review.validator.js
const Joi = require('joi')

const addReviewSchema = {
  body: Joi.object({
    targetType: Joi.string().valid('Hotel', 'Restaurant', 'Attraction').required(),
    targetId: Joi.string().trim().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().max(100).optional().allow(''),
    text: Joi.string().trim().max(2000).optional().allow(''),
  }).required()
}

const editReviewSchema = {
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().trim().max(100).optional().allow(''),
    text: Joi.string().trim().max(2000).optional().allow(''),
  }).required()
}

module.exports = {
  addReviewSchema,
  editReviewSchema,
}
