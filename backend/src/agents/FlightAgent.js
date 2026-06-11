// server/src/agents/FlightAgent.js
const BaseAgent = require('./BaseAgent')

class FlightAgent extends BaseAgent {
  constructor() { super('FlightAgent') }

  buildPrompt({ destination, source, days, budget }) {
    return `
You are a travel transport expert. Generate realistic transport options from ${source || 'nearest major city'} to ${destination} for a ${days}-day trip with a total budget of ₹${budget} INR.

Return ONLY valid JSON with this schema:
{
  "transport_options": [
    {
      "mode": "<Flight|Train|Bus|Road>",
      "operator": "<airline/operator name>",
      "departure_hub": "<city>",
      "duration": "<Xh Ym>",
      "cost_per_person": <number>,
      "total_cost_return": <number>,
      "comfort": "<low|medium|high>",
      "recommended": <true|false>,
      "booking_tip": "<practical tip>"
    }
  ],
  "recommended_mode": "<best mode for this trip>",
  "total_transport_budget": <number>
}

Rules:
- Provide 3-4 transport options
- All costs in INR, realistic for India
- Mark the best value option as recommended: true
- Output ONLY the JSON object
`
  }

  parseResult(json) {
    return { flights: json }
  }

  fallback({ destination, budget }) {
    return {
      flights: {
        transport_options: [
          { mode: 'Train', operator: 'Indian Railways', duration: 'varies', cost_per_person: Math.round(budget * 0.08), total_cost_return: Math.round(budget * 0.15), comfort: 'medium', recommended: true, booking_tip: 'Book 30 days in advance on IRCTC' },
          { mode: 'Bus', operator: 'State Roadways', duration: 'varies', cost_per_person: Math.round(budget * 0.04), total_cost_return: Math.round(budget * 0.08), comfort: 'low', recommended: false, booking_tip: 'Book on RedBus for comfort coaches' }
        ],
        recommended_mode: 'Train',
        total_transport_budget: Math.round(budget * 0.15)
      }
    }
  }
}

module.exports = FlightAgent
