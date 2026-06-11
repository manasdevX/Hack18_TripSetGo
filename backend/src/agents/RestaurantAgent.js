// server/src/agents/RestaurantAgent.js
const BaseAgent = require('./BaseAgent')

class RestaurantAgent extends BaseAgent {
  constructor() { super('RestaurantAgent') }

  buildPrompt({ destination, interests, budget, days }) {
    const foodBudgetPerDay = Math.round((budget * 0.20) / days)
    const interestStr = interests?.length ? interests.join(', ') : 'local cuisine'

    return `
You are a food and dining expert for Indian travel. Recommend restaurants in ${destination} for a traveler who likes: ${interestStr}.
Daily food budget target: ₹${foodBudgetPerDay} INR per person.

Return ONLY valid JSON with this schema:
{
  "restaurants": [
    {
      "name": "<restaurant name>",
      "cuisine": "<cuisine type>",
      "specialty_dish": "<must-try dish>",
      "area": "<location in ${destination}>",
      "meal_type": "<breakfast|lunch|dinner|all-day>",
      "price_range": "<budget|moderate|upscale>",
      "avg_cost_per_person": <number in INR>,
      "rating": <1-5>,
      "tip": "<ordering or visiting tip>"
    }
  ],
  "daily_food_budget": <number>,
  "total_food_budget": <number for ${days} days>
}

Rules:
- Provide 6 restaurants covering all meal types
- Include at least one street food/local specialty spot
- All costs in INR
- Output ONLY the JSON object
`
  }

  parseResult(json) {
    return { restaurants: json.restaurants || [], daily_food_budget: json.daily_food_budget || 0, total_food_budget: json.total_food_budget || 0 }
  }

  fallback({ destination, budget, days }) {
    const perDay = Math.round((budget * 0.20) / days)
    return {
      restaurants: [
        { name: `${destination} Dhaba`, cuisine: 'North Indian', specialty_dish: 'Dal Makhani', area: 'Old City', meal_type: 'all-day', price_range: 'budget', avg_cost_per_person: Math.round(perDay * 0.3), rating: 4, tip: 'Try the thali for best value' },
        { name: `Hotel Saravana Bhavan`, cuisine: 'South Indian', specialty_dish: 'Masala Dosa', area: 'Main Road', meal_type: 'breakfast', price_range: 'budget', avg_cost_per_person: 150, rating: 4, tip: 'Arrive early to avoid queue' }
      ],
      daily_food_budget: perDay,
      total_food_budget: perDay * days
    }
  }
}

module.exports = RestaurantAgent
