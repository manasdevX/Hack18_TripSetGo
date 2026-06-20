// server/src/routes/planner.routes.js
const router        = require('express').Router()
const plannerCtrl   = require('../controllers/planner.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const validate      = require('../middleware/validate.middleware')
const Joi           = require('joi')

// Joi schema for plan generation
const generateSchema = {
  body: Joi.object({
    destination: Joi.string().trim().min(2).max(100).required(),
    budget:      Joi.number().positive().required(),
    days:        Joi.number().integer().min(1).max(30).required(),
    interests:   Joi.array().items(Joi.string().trim().max(50)).max(10).default([])
  })
}

// Joi schema for single-day regeneration
const regenerateDaySchema = {
  body: Joi.object({
    source:       Joi.string().trim().max(100).allow('').optional(),
    destination:  Joi.string().trim().min(2).max(100).required(),
    dayNumber:    Joi.number().integer().min(1).max(60).required(),
    totalDays:    Joi.number().integer().min(1).max(60).required(),
    budget:       Joi.number().positive().required(),
    numTravelers: Joi.number().integer().min(1).max(50).default(1),
    groupType:    Joi.string().trim().max(20).default('solo'),
    preferences:  Joi.array().items(Joi.string().trim().max(50)).max(15).default([]),
    avoid:        Joi.array().items(Joi.string().trim().max(120)).max(60).default([]),
  }),
}

// POST /api/v1/planner/generate
// optionalAuth: authenticated users get subscription enforcement, guests get a free plan
router.post('/generate', optionalAuth, validate(generateSchema), plannerCtrl.generatePlan)

// POST /api/v1/planner/regenerate-day — refine one day of an existing plan
router.post('/regenerate-day', authenticate, validate(regenerateDaySchema), plannerCtrl.regenerateDay)

module.exports = router
