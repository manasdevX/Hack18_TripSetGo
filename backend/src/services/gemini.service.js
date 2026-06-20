// server/src/services/gemini.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai')
const logger = require('../utils/logger')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

/**
 * Generate a structured travel plan using Gemini AI.
 * Returns a JSON object matching the TripSetGo plan schema.
 * Falls back to null on failure — caller should use fallbackPlanner.
 */
async function generateTripPlan({ source, destination, startDate, endDate, budget, numTravelers, groupType, preferences = [], pace = 'balanced' }) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1

  const prompt = `
You are an expert travel planner AI. Generate a detailed, structured travel plan in valid JSON format only.

Trip Details:
- From: ${source}
- To: ${destination}
- Start: ${startDate}
- End: ${endDate}
- Duration: ${days} days
- Total Budget: ₹${budget} INR
- Travelers: ${numTravelers} (${groupType})
- Preferences: ${preferences.join(', ') || 'general travel'}
- Pace: ${pace} (relaxed = fewer, unhurried activities per day; packed = more, back-to-back)

Return ONLY valid JSON (no markdown, no explanation) with this exact schema:
{
  "meta": {
    "destination": "${destination}",
    "total_days": ${days},
    "total_budget": ${budget},
    "theme": "<travel theme based on destination>",
    "tags": ["<tag1>", "<tag2>", "<tag3>"]
  },
  "transport_options": [
    {"mode": "<mode>", "cost_per_person": <number>, "total_cost": <number>, "comfort": "<low|medium|high>", "duration": "<time>", "recommended": <true|false>}
  ],
  "hotel_options": [
    {"name": "<hotel>", "tier": "<budget|standard|luxury>", "price_per_night": <number>, "total_cost": <number>, "rating": <1-5>, "amenities": ["<am1>", "<am2>"], "location": "<area>"}
  ],
  "food_plans": [
    {"name": "<plan name>", "cost_per_day": <number>, "total_cost": <number>, "highlights": ["<dish1>", "<dish2>"]}
  ],
  "itinerary": [
    {
      "day": 1, "date": "${startDate}",
      "morning":   {"activities": [{"name": "<act>", "type": "<sightseeing|adventure|food|culture|leisure>", "duration": "<Xh>", "cost": <number>, "description": "<desc>"}]},
      "afternoon": {"activities": [...]},
      "evening":   {"activities": [...]}
    }
  ],
  "ai_suggestions": [
    {"type": "<tip|warning|upgrade|adventure>", "icon": "<emoji>", "title": "<title>", "description": "<desc>"}
  ],
  "weather": {"best_season": "<season>", "temp_range": "<e.g. 22-31°C>", "note": "<1-line weather tip for the travel dates>"},
  "packing_list": ["<item1>", "<item2>", "<item3>", "<item4>", "<item5>", "<item6>"],
  "budget_breakdown_estimate": {
    "transport": <number>, "stay": <number>, "food": <number>, "activities": <number>, "misc": <number>
  },
  "ui": {"color_primary": "<hex>", "color_secondary": "<hex>", "destination_vibe": "<word>"}
}

Rules:
- Provide 3-5 transport options, 4-5 hotel options, 3 food plans
- Each day/slot should have exactly 3 activities (scale density to the requested pace)
- packing_list: 6-8 concise, destination- and weather-appropriate items
- All costs must be realistic for India in INR
- Budget breakdown must sum to approximately ₹${budget}
- Output ONLY the JSON object, nothing else
`

  let attempt = 0
  const maxRetries = 3
  const delays = [1000, 2000, 4000]

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt)
      const text   = result.response.text().trim()

      // Extract JSON (strip any accidental markdown fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON object found in response')

      const plan = JSON.parse(jsonMatch[0])
      logger.info(`✅ Gemini plan generated for ${destination} (attempt ${attempt + 1})`)
      return plan
    } catch (err) {
      attempt++
      if (attempt < maxRetries) {
        logger.warn(`⚠️ Gemini attempt ${attempt} failed: ${err.message} — retrying in ${delays[attempt - 1]}ms`)
        await new Promise(r => setTimeout(r, delays[attempt - 1]))
      } else {
        logger.error(`❌ Gemini failed after ${maxRetries} attempts: ${err.message}`)
        return null
      }
    }
  }
}

/**
 * Generate a rich, structured travel plan from simple user inputs.
 * Input: { destination, budget, days, interests }
 * Output: Full plan with itinerary, attractions, restaurants, cost breakdown, packing list.
 * Falls back to null on failure — caller should use fallbackPlanner.
 */
async function generateDetailedPlan({ destination, budget, days, interests = [] }) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const interestStr = interests.length > 0 ? interests.join(', ') : 'general sightseeing'

  const prompt = `
You are an expert AI travel planner specializing in Indian destinations. Generate a comprehensive, highly detailed travel plan in valid JSON format ONLY.

Trip Details:
- Destination: ${destination}
- Total Budget: ₹${budget} INR
- Duration: ${days} days
- Traveler Interests: ${interestStr}

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with EXACTLY this schema:

{
  "meta": {
    "destination": "${destination}",
    "days": ${days},
    "budget": ${budget},
    "theme": "<1-3 word travel theme, e.g. 'Cultural Exploration'>",
    "best_time_to_visit": "<months>",
    "tags": ["<tag1>", "<tag2>", "<tag3>"]
  },
  "estimated_cost": {
    "accommodation": <number>,
    "food": <number>,
    "transport": <number>,
    "attractions": <number>,
    "shopping_misc": <number>,
    "total": <number>,
    "currency": "INR",
    "note": "<brief cost-saving tip>"
  },
  "itinerary": [
    {
      "day": 1,
      "theme": "<day theme, e.g. 'Arrival & Old City Exploration'>",
      "morning": {
        "time": "09:00 - 12:00",
        "activity": "<activity name>",
        "description": "<2-sentence description>",
        "estimated_cost": <number>,
        "tips": "<local tip>"
      },
      "afternoon": {
        "time": "13:00 - 17:00",
        "activity": "<activity name>",
        "description": "<2-sentence description>",
        "estimated_cost": <number>,
        "tips": "<local tip>"
      },
      "evening": {
        "time": "18:00 - 21:00",
        "activity": "<activity name>",
        "description": "<2-sentence description>",
        "estimated_cost": <number>,
        "tips": "<local tip>"
      }
    }
  ],
  "recommended_attractions": [
    {
      "name": "<attraction name>",
      "category": "<Heritage|Nature|Adventure|Spiritual|Entertainment>",
      "description": "<2-sentence description>",
      "entry_fee": <number>,
      "best_time": "<morning|afternoon|evening>",
      "duration": "<X hours>",
      "must_see": <true|false>
    }
  ],
  "recommended_restaurants": [
    {
      "name": "<restaurant name>",
      "cuisine": "<cuisine type>",
      "specialty": "<signature dish>",
      "price_range": "<budget|moderate|upscale>",
      "avg_cost_per_person": <number>,
      "meal_type": "<breakfast|lunch|dinner|all-day>",
      "local_tip": "<ordering tip>"
    }
  ],
  "packing_suggestions": {
    "clothing": ["<item1>", "<item2>", "<item3>"],
    "essentials": ["<item1>", "<item2>", "<item3>"],
    "documents": ["<item1>", "<item2>"],
    "tech": ["<item1>", "<item2>"],
    "health_safety": ["<item1>", "<item2>", "<item3>"],
    "weather_note": "<brief weather note for the destination>"
  },
  "local_tips": [
    {"icon": "<emoji>", "tip": "<practical local travel tip>"}
  ]
}

Rules:
- Generate exactly ${days} day objects in the itinerary array
- Include exactly 5 recommended attractions
- Include exactly 5 recommended restaurants covering different meal types
- All costs must be realistic for India in INR
- estimated_cost.total must be close to ₹${budget}
- Output ONLY the JSON object, nothing else
`

  let attempt = 0
  const maxRetries = 3
  const delays = [1000, 2000, 4000]

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt)
      const text   = result.response.text().trim()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON object found in response')

      const plan = JSON.parse(jsonMatch[0])
      logger.info(`✅ Gemini detailed plan generated for ${destination} (attempt ${attempt + 1})`)
      return plan
    } catch (err) {
      attempt++
      if (attempt < maxRetries) {
        logger.warn(`⚠️ Gemini detailed plan attempt ${attempt} failed: ${err.message} — retrying in ${delays[attempt - 1]}ms`)
        await new Promise(r => setTimeout(r, delays[attempt - 1]))
      } else {
        logger.error(`❌ Gemini detailed plan failed after ${maxRetries} attempts: ${err.message}`)
        return null
      }
    }
  }
}

/**
 * Regenerate a SINGLE day of an existing itinerary, keeping the same schema
 * the Planner UI renders (morning/afternoon/evening → activities[]).
 * Input: { source, destination, dayNumber, totalDays, budget, numTravelers,
 *          groupType, preferences, avoid }
 *   - `avoid` is a list of place/activity names already used on other days,
 *     so the model doesn't repeat them.
 * Returns a single day object, or null on failure (caller uses the fallback).
 */
async function regenerateItineraryDay({
  source, destination, dayNumber, totalDays,
  budget, numTravelers = 1, groupType = 'solo', preferences = [], avoid = [],
}) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const perDayBudget = Math.round(Number(budget) / Math.max(Number(totalDays) || 1, 1))

  const prompt = `
You are an expert travel planner AI. Regenerate ONLY day ${dayNumber} of a ${totalDays}-day trip to ${destination}${source ? ` (travelling from ${source})` : ''}.
Travelers: ${numTravelers} (${groupType}). Spend roughly ₹${perDayBudget} INR on this day's activities.
Preferences: ${preferences.join(', ') || 'general travel'}.
${avoid.length ? `Do NOT repeat any of these places already planned on other days: ${avoid.slice(0, 40).join(', ')}.` : ''}

Return ONLY valid JSON (no markdown, no explanation) with EXACTLY this schema:
{
  "day": ${dayNumber},
  "morning":   {"activities": [{"name": "<act>", "type": "<sightseeing|adventure|food|culture|leisure>", "duration": "<Xh>", "cost": <number>, "description": "<one-line desc>"}]},
  "afternoon": {"activities": [{"name": "<act>", "type": "<...>", "duration": "<Xh>", "cost": <number>, "description": "<...>"}]},
  "evening":   {"activities": [{"name": "<act>", "type": "<...>", "duration": "<Xh>", "cost": <number>, "description": "<...>"}]}
}

Rules:
- Each slot (morning, afternoon, evening) must contain exactly 3 distinct activities.
- Suggest fresh, varied activities that differ from typical day-1 picks.
- All costs must be realistic for India in INR.
- Output ONLY the JSON object, nothing else.
`

  let attempt = 0
  const maxRetries = 3
  const delays = [800, 1600, 3200]

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt)
      const text   = result.response.text().trim()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON object found in response')

      const day = JSON.parse(jsonMatch[0])
      // Basic shape guard — every slot must carry an activities array.
      const slotsOk = ['morning', 'afternoon', 'evening'].every(
        (s) => day[s] && Array.isArray(day[s].activities) && day[s].activities.length > 0
      )
      if (!slotsOk) throw new Error('Regenerated day is missing slot activities')

      day.day = Number(dayNumber)
      logger.info(`✅ Gemini regenerated day ${dayNumber} for ${destination} (attempt ${attempt + 1})`)
      return day
    } catch (err) {
      attempt++
      if (attempt < maxRetries) {
        logger.warn(`⚠️ Gemini regenerate-day attempt ${attempt} failed: ${err.message} — retrying in ${delays[attempt - 1]}ms`)
        await new Promise((r) => setTimeout(r, delays[attempt - 1]))
      } else {
        logger.error(`❌ Gemini regenerate-day failed after ${maxRetries} attempts: ${err.message}`)
        return null
      }
    }
  }
}

// ── Travel Copilot (conversational) ─────────────────────────────────────────
// Grounded chat: a system instruction carries trip/user context, `history` is
// the running conversation ([{ role: 'user'|'assistant', text }]).

function buildCopilotModel(system) {
  return genAI.getGenerativeModel({ model: MODEL, systemInstruction: system })
}

function toGeminiContents(history) {
  return (history || []).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.text || '') }],
  }))
}

// Async generator yielding reply text chunks as they arrive.
async function* copilotReplyStream({ system, history }) {
  const model = buildCopilotModel(system)
  const result = await model.generateContentStream({ contents: toGeminiContents(history) })
  for await (const chunk of result.stream) {
    const t = typeof chunk.text === 'function' ? chunk.text() : ''
    if (t) yield t
  }
}

// Non-streaming fallback — returns the full reply text (with a short retry).
async function copilotReply({ system, history }) {
  const model = buildCopilotModel(system)
  let attempt = 0
  const delays = [800, 1600]
  while (true) {
    try {
      const result = await model.generateContent({ contents: toGeminiContents(history) })
      return result.response.text()
    } catch (err) {
      if (attempt >= delays.length) throw err
      await new Promise((r) => setTimeout(r, delays[attempt]))
      attempt++
    }
  }
}

module.exports = {
  generateTripPlan,
  generateDetailedPlan,
  regenerateItineraryDay,
  copilotReplyStream,
  copilotReply,
}
