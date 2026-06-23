// backend/src/validators/flights.validator.js
// ─────────────────────────────────────────────────────────────────────────────
// Joi validation schemas for the Flight Search Engine API.
// ─────────────────────────────────────────────────────────────────────────────
const Joi = require('joi')

// ── Reusable ──────────────────────────────────────────────────────────────────

const iataCodeField = Joi.string()
  .trim()
  .uppercase()
  .length(3)
  .pattern(/^[A-Z]{3}$/)
  .messages({
    'string.length':       'Airport code must be exactly 3 letters (IATA format)',
    'string.pattern.base': 'Airport code must be 3 uppercase letters (e.g. DEL, BOM)',
  })

const isoDateField = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  })

const passengerCount = Joi.number().integer().min(0).max(9).default(0)

// ── airportSearchSchema ───────────────────────────────────────────────────────

/**
 * GET /api/v1/flights/airports?keyword=Delhi&subType=AIRPORT,CITY
 */
const airportSearchSchema = Joi.object({
  keyword: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Keyword is required (e.g. "Delhi", "DEL", "Mumbai")',
      'string.min':   'Keyword must be at least 2 characters',
      'any.required': 'Keyword is required',
    }),

  subType: Joi.string()
    .valid('AIRPORT', 'CITY', 'AIRPORT,CITY')
    .default('AIRPORT,CITY')
    .optional(),

  countryCode: Joi.string()
    .length(2)
    .uppercase()
    .optional()
    .description('ISO 3166 alpha-2 country code to restrict results (e.g. "IN")'),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(10)
    .optional(),
})

// ── flightSearchSchema ────────────────────────────────────────────────────────

/**
 * GET /api/v1/flights/search
 */
const flightSearchSchema = Joi.object({
  origin: iataCodeField.required()
    .messages({ 'any.required': 'Origin airport code is required (e.g. "DEL")' }),

  destination: iataCodeField.required()
    .messages({ 'any.required': 'Destination airport code is required (e.g. "BOM")' }),

  departureDate: isoDateField.required()
    .messages({ 'any.required': 'Departure date is required (YYYY-MM-DD)' }),

  returnDate: isoDateField.optional()
    .description('Return date for round-trip (YYYY-MM-DD). Omit for one-way.'),

  adults: Joi.number()
    .integer()
    .min(1)
    .max(9)
    .default(1)
    .optional()
    .description('Number of adult passengers (12+ years)'),

  children: passengerCount.description('Number of children (2–11 years)'),
  infants:  passengerCount.description('Number of infants (under 2 years, lap)'),

  travelClass: Joi.string()
    .valid('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST')
    .default('ECONOMY')
    .optional(),

  max: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .optional()
    .description('Maximum number of results (1–50)'),

  nonStop: Joi.boolean()
    .default(false)
    .optional()
    .truthy('true', '1')
    .falsy('false', '0')
    .description('Return non-stop flights only'),
})
  .custom((obj, helpers) => {
    // Children + infants cannot exceed adults
    if (obj.infants > obj.adults) {
      return helpers.error('any.invalid', { message: 'Number of infants cannot exceed number of adults' })
    }
    // Departure date must not be in the past
    const today = new Date().toISOString().split('T')[0]
    if (obj.departureDate < today) {
      return helpers.error('any.invalid', { message: 'Departure date cannot be in the past' })
    }
    // Return date must be after departure date
    if (obj.returnDate && obj.returnDate <= obj.departureDate) {
      return helpers.error('any.invalid', { message: 'Return date must be after departure date' })
    }
    return obj
  })

// ── pricingSchema ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/flights/pricing
 * Body: { offer: { ...rawAmadeusOffer } }
 */
const pricingSchema = Joi.object({
  offer: Joi.object({
    id:           Joi.string().required(),
    itineraries:  Joi.array().min(1).required(),
    price:        Joi.object().required(),
    travelerPricings: Joi.array().optional(),
  })
    .required()
    .unknown(true)   // allow all Amadeus fields
    .messages({ 'any.required': 'Flight offer object is required' }),
})

// ── airlineSchema ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/flights/airlines?codes=6E,AI
 */
const airlineSchema = Joi.object({
  codes: Joi.string()
    .pattern(/^[A-Z0-9]{2}(,[A-Z0-9]{2})*$/i)
    .required()
    .messages({
      'string.pattern.base': 'codes must be comma-separated 2-character IATA airline codes (e.g. "6E,AI")',
      'any.required':        'codes parameter is required (e.g. ?codes=6E,AI)',
    }),
})

module.exports = {
  airportSearchSchema,
  flightSearchSchema,
  pricingSchema,
  airlineSchema,
}
