// server/src/agents/Orchestrator.js
const FlightAgent     = require('./FlightAgent')
const WeatherAgent    = require('./WeatherAgent')
const AttractionAgent = require('./AttractionAgent')
const HotelAgent      = require('./HotelAgent')
const RestaurantAgent = require('./RestaurantAgent')
const BudgetAgent     = require('./BudgetAgent')
const ItineraryAgent  = require('./ItineraryAgent')
const logger          = require('../utils/logger')

/**
 * Orchestrator — coordinates all agents in a staged parallel execution flow.
 *
 * Execution Plan:
 *   Round 1 (Parallel): FlightAgent | WeatherAgent | AttractionAgent
 *   Round 2 (Parallel): HotelAgent  | RestaurantAgent  (use Round 1 results)
 *   Round 3 (Serial):   BudgetAgent → ItineraryAgent   (use all prior results)
 */
class Orchestrator {
  constructor() {
    this.flightAgent     = new FlightAgent()
    this.weatherAgent    = new WeatherAgent()
    this.attractionAgent = new AttractionAgent()
    this.hotelAgent      = new HotelAgent()
    this.restaurantAgent = new RestaurantAgent()
    this.budgetAgent     = new BudgetAgent()
    this.itineraryAgent  = new ItineraryAgent()
  }

  /**
   * Run the full multi-agent pipeline for a travel plan request.
   * @param {{ destination, source, budget, days, interests }} input
   * @returns {Object} Complete travel plan assembled from all agents
   */
  async run(input) {
    const startTime = Date.now()
    logger.info(`[Orchestrator] 🚀 Starting multi-agent plan for "${input.destination}" (${input.days} days, ₹${input.budget})`)

    // Shared memory — all agents read from and write to this object
    const memory = { ...input }

    // ── Round 1: Independent agents run in parallel ───────────────────────
    logger.info('[Orchestrator] ▶ Round 1: Flight | Weather | Attraction agents')
    const [flightResult, weatherResult, attractionResult] = await Promise.allSettled([
      this.flightAgent.execute(memory),
      this.weatherAgent.execute(memory),
      this.attractionAgent.execute(memory)
    ])

    // Merge Round 1 results into shared memory
    if (flightResult.status     === 'fulfilled') Object.assign(memory, flightResult.value)
    if (weatherResult.status    === 'fulfilled') Object.assign(memory, weatherResult.value)
    if (attractionResult.status === 'fulfilled') Object.assign(memory, attractionResult.value)

    logger.info(`[Orchestrator] ✅ Round 1 complete — memory keys: ${Object.keys(memory).join(', ')}`)

    // ── Round 2: Context-aware agents run in parallel ─────────────────────
    logger.info('[Orchestrator] ▶ Round 2: Hotel | Restaurant agents')
    const [hotelResult, restaurantResult] = await Promise.allSettled([
      this.hotelAgent.execute(memory),
      this.restaurantAgent.execute(memory)
    ])

    if (hotelResult.status      === 'fulfilled') Object.assign(memory, hotelResult.value)
    if (restaurantResult.status === 'fulfilled') Object.assign(memory, restaurantResult.value)

    logger.info(`[Orchestrator] ✅ Round 2 complete — memory keys: ${Object.keys(memory).join(', ')}`)

    // ── Round 3: Budget then Itinerary (serial — each depends on prior) ───
    logger.info('[Orchestrator] ▶ Round 3: Budget agent')
    const budgetResult = await this.budgetAgent.execute(memory)
    Object.assign(memory, budgetResult)

    logger.info('[Orchestrator] ▶ Round 3: Itinerary agent (final assembly)')
    const itineraryResult = await this.itineraryAgent.execute(memory)
    Object.assign(memory, itineraryResult)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    logger.info(`[Orchestrator] 🎉 Plan complete in ${elapsed}s`)

    // ── Assemble final response ───────────────────────────────────────────
    return {
      meta: {
        destination: input.destination,
        days:        input.days,
        budget:      input.budget,
        interests:   input.interests || [],
        generated_at: new Date().toISOString(),
        elapsed_seconds: Number(elapsed)
      },
      flights:          memory.flights      || {},
      weather:          memory.weather      || {},
      attractions:      memory.attractions  || [],
      hotels:           memory.hotels       || [],
      restaurants:      memory.restaurants  || [],
      budget_plan:      memory.budget       || {},
      itinerary:        memory.itinerary    || [],
      packing_list:     memory.packing_list || {},
      travel_tips:      memory.travel_tips  || []
    }
  }
}

module.exports = Orchestrator
