// server/src/controllers/planner.controller.js
const { generateDetailedPlan }  = require('../services/gemini.service')
const fallback                   = require('../planning/fallbackPlanner')
const Subscription               = require('../models/Subscription.model')
const { success, created, badRequest } = require('../utils/response')
const asyncHandler               = require('../utils/asyncHandler')
const logger                     = require('../utils/logger')

/**
 * POST /api/v1/planner/generate
 * Generate a detailed AI travel plan.
 *
 * Body: { destination, budget, days, interests }
 *
 * Returns: full structured plan with itinerary, attractions,
 *          restaurants, cost breakdown, and packing suggestions.
 */
exports.generatePlan = asyncHandler(async (req, res) => {
  const { destination, budget, days, interests } = req.body

  // --- Input Validation ---
  if (!destination || typeof destination !== 'string' || destination.trim().length < 2) {
    return badRequest(res, 'destination is required (min 2 characters)')
  }
  if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
    return badRequest(res, 'budget must be a positive number')
  }
  if (!days || isNaN(Number(days)) || Number(days) < 1 || Number(days) > 30) {
    return badRequest(res, 'days must be a number between 1 and 30')
  }

  const input = {
    destination: destination.trim(),
    budget:      Number(budget),
    days:        Number(days),
    interests:   Array.isArray(interests) ? interests.slice(0, 10) : []
  }

  // --- Enforce Subscription Limit (if authenticated) ---
  if (req.user) {
    const subscription = await Subscription.findOne({ userId: req.user._id })
    if (subscription && !subscription.canSearch()) {
      return res.status(429).json({
        success: false,
        message: `Daily search limit reached (${subscription.getSearchLimit()} plans/day). Upgrade to Pro for unlimited plans.`
      })
    }

    // Increment usage counter
    if (subscription) {
      subscription.checkAndResetDaily()
      subscription.searchesToday += 1
      subscription.lastSearchDate = new Date()
      await subscription.save()
    }
  }

  // --- Call Gemini AI ---
  let plan        = await generateDetailedPlan(input)
  let usedFallback = false

  if (!plan) {
    logger.warn(`⚠️ Gemini failed — using deterministic fallback for ${input.destination}`)
    plan = fallback.generateDetailedFallback(input)
    usedFallback = true
  }

  logger.info(`✅ Planner: Plan generated for "${input.destination}" (${usedFallback ? 'fallback' : 'Gemini'})`)

  created(res, { plan, usedFallback, destination: input.destination, days: input.days, budget: input.budget }, 'Travel plan generated successfully')
})
