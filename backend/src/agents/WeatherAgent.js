// server/src/agents/WeatherAgent.js
const BaseAgent = require('./BaseAgent')

class WeatherAgent extends BaseAgent {
  constructor() { super('WeatherAgent') }

  buildPrompt({ destination, days }) {
    const month = new Date().toLocaleString('en-IN', { month: 'long' })
    return `
You are a weather and travel conditions expert. Provide a weather summary for ${destination} for a ${days}-day trip starting this month (${month}).

Return ONLY valid JSON with this schema:
{
  "weather": {
    "season": "<Summer|Monsoon|Winter|Spring>",
    "avg_temperature": "<X°C - Y°C>",
    "conditions": "<brief description>",
    "rainfall_chance": "<low|medium|high>",
    "best_time_of_day": "<morning|afternoon|evening>",
    "clothing_tips": ["<tip1>", "<tip2>", "<tip3>"],
    "warnings": ["<warning1>"],
    "overall_rating": "<Excellent|Good|Average|Poor> for travel"
  }
}

Output ONLY the JSON object, nothing else.
`
  }

  parseResult(json) {
    return { weather: json.weather }
  }

  fallback({ destination }) {
    return {
      weather: {
        season: 'Varies',
        avg_temperature: '20°C - 35°C',
        conditions: `Generally pleasant weather in ${destination}`,
        rainfall_chance: 'low',
        best_time_of_day: 'morning',
        clothing_tips: ['Light cottons', 'Sunscreen essential', 'Comfortable walking shoes'],
        warnings: [],
        overall_rating: 'Good for travel'
      }
    }
  }
}

module.exports = WeatherAgent
