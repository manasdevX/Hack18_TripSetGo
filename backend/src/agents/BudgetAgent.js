// server/src/agents/BudgetAgent.js
const BaseAgent = require('./BaseAgent')

class BudgetAgent extends BaseAgent {
  constructor() { super('BudgetAgent') }

  buildPrompt({ destination, budget, days, flights, hotels, restaurants }) {
    const transportCost = flights?.total_transport_budget || Math.round(budget * 0.15)
    const hotelCost     = hotels?.total_accommodation_budget || Math.round(budget * 0.30)
    const foodCost      = restaurants?.total_food_budget || Math.round(budget * 0.20)

    return `
You are a travel budget planning expert. Analyze this trip budget for ${destination} (${days} days, total ₹${budget} INR).

Known costs collected from other agents:
- Transport: ₹${transportCost}
- Accommodation: ₹${hotelCost}
- Food: ₹${foodCost}

Return ONLY valid JSON with this schema:
{
  "budget_breakdown": {
    "transport":      {"allocated": ${transportCost}, "tips": "<saving tip>"},
    "accommodation":  {"allocated": ${hotelCost},     "tips": "<saving tip>"},
    "food":           {"allocated": ${foodCost},       "tips": "<saving tip>"},
    "attractions":    {"allocated": <number>,          "tips": "<saving tip>"},
    "shopping_misc":  {"allocated": <number>,          "tips": "<saving tip>"},
    "emergency_fund": {"allocated": <number>,          "tips": "Keep for unexpected expenses"},
    "total_allocated": <must sum to ~${budget}>,
    "remaining":       <budget minus total_allocated>
  },
  "daily_spending_limit": <number per day>,
  "money_saving_tips": ["<tip1>", "<tip2>", "<tip3>"],
  "overall_budget_verdict": "<Tight|Comfortable|Generous>"
}

Rules:
- All allocations must sum to approximately ₹${budget}
- Provide 3 money saving tips specific to ${destination}
- Output ONLY the JSON object
`
  }

  parseResult(json) {
    return { budget: json }
  }

  fallback({ budget, days }) {
    const perDay = Math.round(budget / days)
    return {
      budget: {
        budget_breakdown: {
          transport:      { allocated: Math.round(budget * 0.15), tips: 'Book trains in advance' },
          accommodation:  { allocated: Math.round(budget * 0.30), tips: 'Choose standard hotels' },
          food:           { allocated: Math.round(budget * 0.20), tips: 'Eat at local dhabas' },
          attractions:    { allocated: Math.round(budget * 0.15), tips: 'Buy combo tickets' },
          shopping_misc:  { allocated: Math.round(budget * 0.12), tips: 'Bargain at local markets' },
          emergency_fund: { allocated: Math.round(budget * 0.08), tips: 'Keep for unexpected expenses' },
          total_allocated: budget,
          remaining: 0
        },
        daily_spending_limit: perDay,
        money_saving_tips: ['Travel by train for long distances', 'Eat at local restaurants', 'Visit free monuments in mornings'],
        overall_budget_verdict: 'Comfortable'
      }
    }
  }
}

module.exports = BudgetAgent
