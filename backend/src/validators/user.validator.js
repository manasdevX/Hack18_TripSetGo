// server/src/validators/user.validator.js
const Joi = require('joi')

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).optional(),
    bio: Joi.string().trim().max(300).optional().allow(''),
    location: Joi.string().trim().max(100).optional().allow(''),
    travelInterests: Joi.array().items(Joi.string().trim()).max(20).optional(),
    favoriteDestinations: Joi.array().items(Joi.string().trim()).max(10).optional(),
  })
}

module.exports = {
  updateProfileSchema,
}
