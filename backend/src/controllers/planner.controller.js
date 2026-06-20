// server/src/controllers/planner.controller.js
const { generateDetailedPlan, regenerateItineraryDay } = require('../services/gemini.service')
const fallback                   = require('../planning/fallbackPlanner')
const Subscription               = require('../models/Subscription.model')
const cacheService               = require('../services/cache.service')
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
 *
 * Caching strategy:
 *   - Key: SHA-256 hash of (destination + budget + days + sorted interests)
 *   - Namespace: "itinerary"
 *   - TTL: 60 minutes
 *   - POST body is used as the cache discriminator since this is not a GET route
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
    interests:   Array.isArray(interests) ? interests.slice(0, 10).sort() : []
  }

  // --- AI Itinerary Cache Lookup ---
  // Key is deterministic: same params always produce the same cache entry.
  // interests are sorted so ["beach","food"] and ["food","beach"] share a key.
  const cacheRaw = `${input.destination}|${input.budget}|${input.days}|${input.interests.join(',')}`
  const cached   = await cacheService.getByNs('itinerary', cacheRaw)

  if (cached) {
    logger.info(`[Cache] HIT  itinerary — ${input.destination} ${input.days}d $${input.budget}`)
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('X-Cache-Namespace', 'itinerary')
    return created(res, { ...cached, fromCache: true }, 'Travel plan retrieved from cache')
  }

  res.setHeader('X-Cache', 'MISS')
  res.setHeader('X-Cache-Namespace', 'itinerary')

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

  // --- Cache the generated plan ---
  // Only cache Gemini-generated plans; fallback plans are cheap to regenerate.
  if (!usedFallback) {
    try {
      await cacheService.set('itinerary', cacheRaw, { plan, usedFallback, destination: input.destination, days: input.days, budget: input.budget })
      logger.info(`[Cache] SET  itinerary — ${input.destination} (TTL: ${cacheService.TTL.itinerary}s)`)
    } catch (err) {
      logger.warn(`[Cache] Failed to store itinerary: ${err.message}`)
    }
  }

  created(res, { plan, usedFallback, destination: input.destination, days: input.days, budget: input.budget }, 'Travel plan generated successfully')
})

/**
 * POST /api/v1/planner/regenerate-day
 * Regenerate a single day of an itinerary during live planning.
 *
 * Body: { source?, destination, dayNumber, totalDays, budget,
 *         numTravelers?, groupType?, preferences?, avoid? }
 *
 * Returns: { day, usedFallback } where `day` matches the itinerary day schema
 *          (morning/afternoon/evening → activities[]).
 *
 * Note: regeneration is a refinement of an existing plan, so it is intentionally
 * NOT counted against the daily plan-generation limit.
 */
exports.regenerateDay = asyncHandler(async (req, res) => {
  const {
    source, destination, dayNumber, totalDays, budget,
    numTravelers, groupType, preferences, avoid,
  } = req.body

  let day = await regenerateItineraryDay({
    source, destination, dayNumber, totalDays, budget,
    numTravelers, groupType, preferences, avoid,
  })
  let usedFallback = false

  if (!day) {
    logger.warn(`⚠️ Gemini regenerate-day failed — using fallback for ${destination} day ${dayNumber}`)
    day = fallback.regenerateDayFallback({ destination, dayNumber, budget, avoid })
    usedFallback = true
  }

  logger.info(`✅ Planner: regenerated day ${dayNumber} for "${destination}" (${usedFallback ? 'fallback' : 'Gemini'})`)
  created(res, { day, usedFallback }, 'Day regenerated successfully')
})
