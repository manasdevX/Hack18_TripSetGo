// server/src/middleware/validate.middleware.js
const { badRequest } = require('../utils/response')
const logger = require('../utils/logger')

/**
 * Higher-order middleware function to validate incoming requests using Joi schemas.
 * 
 * @param {Object} schema - Joi schema object containing optional body, query, and params schemas.
 * @returns {Function} Express middleware function
 */
// In Express 5, req.query (and sometimes req.params) is exposed via a getter with
// no setter, so a plain assignment throws. This helper assigns when possible and
// falls back to defineProperty so validated/sanitized values stick on both v4 and v5.
const assignReq = (req, key, value) => {
  try {
    req[key] = value
  } catch {
    Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true })
  }
}

const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false, // Return all errors, not just the first one
    allowUnknown: true, // Allow unknown keys that will be ignored
    stripUnknown: true  // Remove unknown keys from the validated object
  }

  // Validate req.body
  if (schema.body) {
    const { error, value } = schema.body.validate(req.body, validationOptions)
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message)
      logger.warn(`Validation Error (Body): ${errorMessages.join(', ')}`)
      return badRequest(res, 'Validation error', errorMessages)
    }
    req.body = value // Replace req.body with validated and sanitized data
  }

  // Validate req.query
  if (schema.query) {
    const { error, value } = schema.query.validate(req.query, validationOptions)
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message)
      logger.warn(`Validation Error (Query): ${errorMessages.join(', ')}`)
      return badRequest(res, 'Validation error', errorMessages)
    }
    assignReq(req, 'query', value)
  }

  // Validate req.params
  if (schema.params) {
    const { error, value } = schema.params.validate(req.params, validationOptions)
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message)
      logger.warn(`Validation Error (Params): ${errorMessages.join(', ')}`)
      return badRequest(res, 'Validation error', errorMessages)
    }
    assignReq(req, 'params', value)
  }

  next()
}

module.exports = validate
