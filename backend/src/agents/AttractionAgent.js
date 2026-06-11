// server/src/agents/AttractionAgent.js
const BaseAgent = require('./BaseAgent')

class AttractionAgent extends BaseAgent {
  constructor() { super('AttractionAgent') }

  buildPrompt({ destination, interests, days }) {
    const interestStr = interests?.length ? interests.join(', ') : 'general sightseeing'
    return `
You are a local travel guide expert for Indian destinations. Recommend the top attractions in ${destination} for a traveler interested in: ${interestStr}. Trip duration: ${days} days.

Return ONLY valid JSON with this schema:
{
  "attractions": [
    {
      "name": "<attraction name>",
      "category": "<Heritage|Nature|Adventure|Spiritual|Shopping|Entertainment>",
      "description": "<2-sentence description>",
      "location": "<area/district in ${destination}>",
      "entry_fee": <number in INR>,
      "best_time": "<morning|afternoon|evening>",
      "duration_hours": <number>,
      "must_see": <true|false>,
      "tip": "<local insider tip>"
    }
  ]
}

Rules:
- Provide exactly 7 attractions
- Mix different categories based on interests
- Mark top 3 as must_see: true
- All fees in INR
- Output ONLY the JSON object
`
  }

  parseResult(json) {
    return { attractions: json.attractions || [] }
  }

  fallback({ destination }) {
    return {
      attractions: [
        { name: `${destination} City Center`, category: 'Heritage', description: 'Historic heart of the city with iconic landmarks.', location: 'City Center', entry_fee: 0, best_time: 'morning', duration_hours: 2, must_see: true, tip: 'Visit early to avoid crowds' },
        { name: `${destination} Local Market`, category: 'Shopping', description: 'Vibrant local market with handicrafts and street food.', location: 'Old Quarter', entry_fee: 0, best_time: 'evening', duration_hours: 2, must_see: true, tip: 'Bargain politely for best prices' }
      ]
    }
  }
}

module.exports = AttractionAgent
