// server/src/agents/ItineraryAgent.js
const BaseAgent = require('./BaseAgent')

class ItineraryAgent extends BaseAgent {
  constructor() { super('ItineraryAgent') }

  buildPrompt({ destination, days, interests, weather, attractions, restaurants, hotels, budget }) {
    const topAttractions = (attractions || []).slice(0, 5).map(a => a.name).join(', ')
    const topRestaurants = (restaurants || []).slice(0, 4).map(r => r.name).join(', ')
    const recommendedHotel = (hotels || []).find(h => h.recommended)?.name || `${destination} Hotel`
    const season = weather?.season || 'current season'
    const dailyLimit = budget?.daily_spending_limit || Math.round(budget / days)

    return `
You are a master travel itinerary planner. Create a highly detailed ${days}-day itinerary for ${destination}.

Context from other agents:
- Season/Weather: ${season} — ${weather?.conditions || ''}
- Top Attractions: ${topAttractions}
- Top Restaurants: ${topRestaurants}
- Recommended Hotel: ${recommendedHotel}
- Daily Budget: ₹${dailyLimit} INR
- Traveler Interests: ${interests?.join(', ') || 'general sightseeing'}

Return ONLY valid JSON with this schema:
{
  "itinerary": [
    {
      "day": 1,
      "theme": "<short day theme>",
      "morning": {
        "time": "09:00 - 12:00",
        "activity": "<activity name>",
        "description": "<2 sentence description>",
        "location": "<specific place>",
        "cost": <number>,
        "tip": "<local tip>"
      },
      "afternoon": {
        "time": "13:00 - 17:00",
        "activity": "<activity name>",
        "description": "<2 sentence description>",
        "location": "<specific place>",
        "cost": <number>,
        "tip": "<local tip>"
      },
      "evening": {
        "time": "18:00 - 21:00",
        "activity": "<activity name>",
        "description": "<2 sentence description>",
        "location": "<specific place>",
        "cost": <number>,
        "tip": "<local tip>"
      },
      "meals": {
        "breakfast": "<restaurant or food suggestion>",
        "lunch": "<restaurant or food suggestion>",
        "dinner": "<restaurant or food suggestion>"
      },
      "daily_cost_estimate": <number>
    }
  ],
  "packing_list": {
    "clothing": ["<item1>", "<item2>", "<item3>"],
    "essentials": ["<item1>", "<item2>", "<item3>"],
    "documents": ["Aadhaar/Passport", "Hotel booking", "Train/Flight tickets"],
    "health": ["<item1>", "<item2>"]
  },
  "travel_tips": ["<tip1>", "<tip2>", "<tip3>"]
}

Rules:
- Generate exactly ${days} day objects
- Use the attractions, restaurants and hotel names from the context above
- Each day theme should be unique and engaging
- Output ONLY the JSON object
`
  }

  parseResult(json) {
    return { itinerary: json.itinerary || [], packing_list: json.packing_list || {}, travel_tips: json.travel_tips || [] }
  }

  fallback({ destination, days }) {
    const itinerary = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      theme: i === 0 ? 'Arrival & Exploration' : i === days - 1 ? 'Departure Day' : `Explore ${destination} — Day ${i + 1}`,
      morning:   { time: '09:00 - 12:00', activity: 'Sightseeing', description: `Explore the highlights of ${destination}.`, location: 'City Center', cost: 200, tip: 'Start early to beat the crowd.' },
      afternoon: { time: '13:00 - 17:00', activity: 'Local Markets', description: 'Shop for souvenirs and taste local food.', location: 'Main Bazaar', cost: 500, tip: 'Bargain confidently.' },
      evening:   { time: '18:00 - 21:00', activity: 'Sunset Walk', description: 'Enjoy the evening ambiance of the city.', location: 'Waterfront/Park', cost: 100, tip: 'Best photo opportunities at golden hour.' },
      meals: { breakfast: 'Local Dhaba', lunch: 'Street Food', dinner: 'Restaurant near hotel' },
      daily_cost_estimate: 1000
    }))

    return {
      itinerary,
      packing_list: {
        clothing: ['Light cottons', 'Comfortable walking shoes', 'Light jacket'],
        essentials: ['Sunscreen', 'Water bottle', 'Power bank'],
        documents: ['Aadhaar/Passport', 'Hotel booking', 'Train/Flight tickets'],
        health: ['Basic medicines', 'Hand sanitizer']
      },
      travel_tips: [`Visit ${destination} on weekdays to avoid crowds`, 'Download offline maps', 'Keep small change ready']
    }
  }
}

module.exports = ItineraryAgent
