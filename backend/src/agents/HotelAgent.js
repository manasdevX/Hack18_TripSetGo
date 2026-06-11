// server/src/agents/HotelAgent.js
const BaseAgent = require('./BaseAgent')

class HotelAgent extends BaseAgent {
  constructor() { super('HotelAgent') }

  buildPrompt({ destination, days, budget, weather, attractions }) {
    const season    = weather?.season || 'unknown season'
    const topAreas  = attractions?.slice(0, 3).map(a => a.location).join(', ') || 'city center'
    const nightBudget = Math.round((budget * 0.30) / days)

    return `
You are a hotel recommendation expert for India. Recommend hotels in ${destination} for ${days} nights.
Season: ${season}. Stay near these popular areas: ${topAreas}.
Per-night budget target: ₹${nightBudget} INR (total hotel budget ~30% of ₹${budget}).

Return ONLY valid JSON with this schema:
{
  "hotels": [
    {
      "name": "<hotel name>",
      "tier": "<budget|standard|luxury>",
      "area": "<location in ${destination}>",
      "price_per_night": <number>,
      "total_cost": <number for ${days} nights>,
      "rating": <1-5>,
      "amenities": ["<am1>", "<am2>", "<am3>"],
      "highlights": "<one sentence why stay here>",
      "recommended": <true|false>
    }
  ],
  "total_accommodation_budget": <number>
}

Rules:
- Provide 4 hotels: 1 budget, 2 standard, 1 luxury
- Mark best value as recommended: true
- All prices in INR
- Output ONLY the JSON object
`
  }

  parseResult(json) {
    return { hotels: json.hotels || [], total_accommodation_budget: json.total_accommodation_budget || 0 }
  }

  fallback({ destination, days, budget }) {
    const nightly = Math.round((budget * 0.30) / days)
    return {
      hotels: [
        { name: `${destination} Budget Inn`, tier: 'budget', area: 'City Center', price_per_night: Math.round(nightly * 0.5), total_cost: Math.round(nightly * 0.5 * days), rating: 3, amenities: ['WiFi', 'AC', 'Breakfast'], highlights: 'Clean and centrally located.', recommended: false },
        { name: `${destination} Grand Hotel`, tier: 'standard', area: 'Main Market', price_per_night: nightly, total_cost: nightly * days, rating: 4, amenities: ['WiFi', 'AC', 'Pool', 'Restaurant'], highlights: 'Best value for comfort.', recommended: true }
      ],
      total_accommodation_budget: nightly * days
    }
  }
}

module.exports = HotelAgent
