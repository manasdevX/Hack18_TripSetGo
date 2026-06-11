// server/src/validators/trip.validator.js
const Joi = require('joi')

/**
 * Schema for creating a new AI-powered trip plan.
 */
const createTripSchema = {
  body: Joi.object({
    source:       Joi.string().trim().min(2).max(100).required(),
    destination:  Joi.string().trim().min(2).max(100).required(),
    startDate:    Joi.date().iso().required(),
    endDate:      Joi.date().iso().greater(Joi.ref('startDate')).required()
                     .messages({ 'date.greater': 'endDate must be after startDate' }),
    budget:       Joi.number().positive().required(),
    numTravelers: Joi.number().integer().min(1).max(50).default(1),
    groupType:    Joi.string().valid('solo', 'couple', 'family', 'friends', 'business').default('solo'),
    preferences:  Joi.array().items(Joi.string().trim()).max(10).default([]),
  })
}

/**
 * Schema for replacing the full structured itinerary.
 */
const saveItinerarySchema = {
  body: Joi.object({
    itinerary: Joi.array().items(
      Joi.object({
        day:  Joi.number().integer().min(1).required(),
        date: Joi.date().iso().optional(),
        activities: Joi.array().items(
          Joi.object({
            targetType: Joi.string().valid('Attraction', 'Restaurant', 'Hotel', 'Custom').required(),
            targetId:   Joi.string().optional(),
            notes:      Joi.string().max(1000).optional().allow(''),
            startTime:  Joi.date().iso().optional(),
          })
        ).default([])
      })
    ).required()
  })
}

/**
 * Schema for adding or updating a single itinerary day.
 */
const itineraryDaySchema = {
  body: Joi.object({
    day:  Joi.number().integer().min(1).required(),
    date: Joi.date().iso().optional(),
    activities: Joi.array().items(
      Joi.object({
        targetType: Joi.string().valid('Attraction', 'Restaurant', 'Hotel', 'Custom').required(),
        targetId:   Joi.string().optional(),
        notes:      Joi.string().max(1000).optional().allow(''),
        startTime:  Joi.date().iso().optional(),
      })
    ).default([])
  })
}

module.exports = { createTripSchema, saveItinerarySchema, itineraryDaySchema }
