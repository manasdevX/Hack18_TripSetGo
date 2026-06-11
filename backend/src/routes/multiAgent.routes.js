// server/src/routes/multiAgent.routes.js
const router      = require('express').Router()
const ctrl        = require('../controllers/multiAgent.controller')
const { optionalAuth } = require('../middleware/auth.middleware')
const validate    = require('../middleware/validate.middleware')
const Joi         = require('joi')

const planSchema = {
  body: Joi.object({
    destination: Joi.string().trim().min(2).max(100).required(),
    budget:      Joi.number().positive().required(),
    days:        Joi.number().integer().min(1).max(30).required(),
    source:      Joi.string().trim().max(100).optional().default('Your Location'),
    interests:   Joi.array().items(Joi.string().trim().max(50)).max(10).default([])
  })
}

// POST /api/v1/multi-agent/plan
router.post('/plan', optionalAuth, validate(planSchema), ctrl.generateMultiAgentPlan)

module.exports = router
