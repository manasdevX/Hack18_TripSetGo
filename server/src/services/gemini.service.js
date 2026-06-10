// server/src/services/gemini.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai')
const logger = require('../utils/logger')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

/**
 * Generate a structured travel plan using Gemini AI.
 * Returns a JSON object matching the TripSetGo plan schema.
 * Falls back to null on failure — caller should use fallbackPlanner.
 */
async function generateTripPlan({ source, destination, startDate, endDate, budget, numTravelers, groupType, preferences = [] }) {
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
  "budget_breakdown_estimate": {
    "transport": <number>, "stay": <number>, "food": <number>, "activities": <number>, "misc": <number>
  },
  "ui": {"color_primary": "<hex>", "color_secondary": "<hex>", "destination_vibe": "<word>"}
}

Rules:
- Provide 3-5 transport options, 4-5 hotel options, 3 food plans
- Each day/slot should have exactly 3 activities
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

module.exports = { generateTripPlan }
