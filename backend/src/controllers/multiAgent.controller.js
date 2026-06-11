// server/src/controllers/multiAgent.controller.js
const Orchestrator  = require('../agents/Orchestrator')
const Subscription  = require('../models/Subscription.model')
const { created, badRequest } = require('../utils/response')
const asyncHandler  = require('../utils/asyncHandler')
const logger        = require('../utils/logger')

// Single orchestrator instance reused across requests (agents are stateless)
const orchestrator = new Orchestrator()

/**
 * POST /api/v1/multi-agent/plan
 * Runs all 6 AI agents via the Orchestrator and returns a complete travel plan.
 *
 * Body: { destination, budget, days, interests, source? }
 */
exports.generateMultiAgentPlan = asyncHandler(async (req, res) => {
  const { destination, budget, days, interests, source } = req.body

  // --- Input Validation ---
  if (!destination || typeof destination !== 'string' || destination.trim().length < 2) {
    return badRequest(res, 'destination is required (min 2 characters)')
  }
  if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
    return badRequest(res, 'budget must be a positive number')
  }
  if (!days || isNaN(Number(days)) || Number(days) < 1 || Number(days) > 30) {
    return badRequest(res, 'days must be between 1 and 30')
  }

  // --- Subscription Limit (authenticated users only) ---
  if (req.user) {
    const subscription = await Subscription.findOne({ userId: req.user._id })
    if (subscription && !subscription.canSearch()) {
      return res.status(429).json({
        success: false,
        message: `Daily limit reached (${subscription.getSearchLimit()} plans/day). Upgrade to Pro for unlimited plans.`
      })
    }
    if (subscription) {
      subscription.checkAndResetDaily()
      subscription.searchesToday += 1
      subscription.lastSearchDate = new Date()
      await subscription.save()
    }
  }

  const input = {
    destination: destination.trim(),
    source:      source?.trim() || 'Your Location',
    budget:      Number(budget),
    days:        Number(days),
    interests:   Array.isArray(interests) ? interests.slice(0, 10) : []
  }

  logger.info(`[MultiAgent] Request: ${input.destination}, ₹${input.budget}, ${input.days} days`)

  // --- Run Orchestrator ---
  const plan = await orchestrator.run(input)

  created(res, plan, 'Multi-agent travel plan generated successfully')
})
