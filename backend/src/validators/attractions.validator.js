// backend/src/validators/attractions.validator.js
// ─────────────────────────────────────────────────────────────────────────────
// Joi validation schemas for the Attractions Discovery API.
// Used by validate.middleware.js before hitting the controller.
// ─────────────────────────────────────────────────────────────────────────────
const Joi = require('joi')

// Valid OTM kinds (subset of most-used; open for extension)
const VALID_KINDS = [
  'interesting_places',
  'historic',
  'museums',
  'natural',
  'religion',
  'parks',
  'cultural',
  'fortifications',
  'castles',
  'ruins',
  'archaeological_sites',
  'memorials',
  'art_galleries',
  'theatres_and_entertainments',
  'amusements',
  'zoos',
  'beaches',
  'nature_reserves',
  'mountains',
  'waterfalls',
  'viewpoints',
  'observation_platforms',
  'restaurants',
  'sport',
]

// ── Reusable fields ───────────────────────────────────────────────────────────

const kindsField = Joi.string()
  .pattern(/^[a-z_,]+$/)
  .max(200)
  .optional()
  .description('Comma-separated OTM category kinds, e.g. "museums,historic"')

const limitField = Joi.number()
  .integer()
  .min(1)
  .max(50)
  .default(20)
  .optional()

// ── cityQuerySchema ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/attractions/city
 * Query: { city, limit?, radius?, kinds? }
 */
const cityQuerySchema = Joi.object({
  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'City name is required',
      'string.min':   'City name must be at least 2 characters',
      'string.max':   'City name must not exceed 100 characters',
      'any.required': 'City name is required',
    }),

  limit: limitField,

  radius: Joi.number()
    .integer()
    .min(500)
    .max(50000)
    .default(12000)
    .optional()
    .description('Search radius in meters around city centre (500–50000)'),

  kinds: kindsField,
})

// ── nearbyQuerySchema ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/attractions/nearby
 * Query: { lat, lon, radius?, limit?, kinds? }
 */
const nearbyQuerySchema = Joi.object({
  lat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.base':  'lat must be a valid number',
      'number.min':   'lat must be between -90 and 90',
      'number.max':   'lat must be between -90 and 90',
      'any.required': 'lat (latitude) is required',
    }),

  lon: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.base':  'lon must be a valid number',
      'number.min':   'lon must be between -180 and 180',
      'number.max':   'lon must be between -180 and 180',
      'any.required': 'lon (longitude) is required',
    }),

  radius: Joi.number()
    .integer()
    .min(100)
    .max(50000)
    .default(5000)
    .optional()
    .description('Search radius in meters (100–50000)'),

  limit: limitField,

  kinds: kindsField,
})

// ── xidParamSchema ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/attractions/:xid
 * Params: { xid }
 */
const xidParamSchema = Joi.object({
  xid: Joi.string()
    .pattern(/^[a-zA-Z0-9_\-:]+$/)
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty':   'Attraction ID (xid) is required',
      'string.pattern.base': 'Invalid attraction ID format',
      'any.required':   'Attraction ID (xid) is required',
    }),
})

module.exports = {
  cityQuerySchema,
  nearbyQuerySchema,
  xidParamSchema,
  VALID_KINDS,
}
