// server/src/planning/fallbackPlanner.js
// Deterministic fallback — runs when Gemini is unavailable
// Mirrors the Python planner.py logic in JavaScript

const DESTINATIONS = {
  'Goa':       { theme: 'beach', vibe: 'Tropical', primary: '#00b4d8', secondary: '#0077b6', places: ['Baga Beach', 'Dudhsagar Falls', 'Fort Aguada', 'Calangute Beach', 'Anjuna Market', 'Basilica of Bom Jesus', 'Chapora Fort', 'Palolem Beach'] },
  'Manali':    { theme: 'mountains', vibe: 'Alpine', primary: '#6366f1', secondary: '#4f46e5', places: ['Rohtang Pass', 'Solang Valley', 'Hadimba Temple', 'Old Manali', 'Beas River', 'Naggar Castle', 'Kullu Valley', 'Manikaran'] },
  'Jaipur':    { theme: 'culture', vibe: 'Royal', primary: '#f59e0b', secondary: '#d97706', places: ['Amber Fort', 'Hawa Mahal', 'City Palace', 'Jantar Mantar', 'Jal Mahal', 'Nahargarh Fort', 'Albert Hall Museum', 'Birla Temple'] },
  'Kerala':    { theme: 'nature', vibe: 'Serene', primary: '#10b981', secondary: '#059669', places: ['Alleppey Backwaters', 'Munnar Tea Gardens', 'Varkala Beach', 'Periyar Wildlife Sanctuary', 'Kovalam Beach', 'Thekkady', 'Athirapally Falls', 'Kumarakom'] },
  'Shimla':    { theme: 'mountains', vibe: 'Colonial', primary: '#8b5cf6', secondary: '#7c3aed', places: ['The Ridge', 'Mall Road', 'Jakhoo Temple', 'Kufri', 'Christ Church', 'Chadwick Falls', 'Naldehra Golf Course', 'Viceregal Lodge'] },
  'DEFAULT':   { theme: 'travel', vibe: 'Adventurous', primary: '#6366f1', secondary: '#8b5cf6', places: ['City Center', 'Local Market', 'Heritage Site', 'Museum', 'Park', 'Viewpoint', 'Temple', 'Beach/Lake'] },
}

const TRANSPORT_MODES = ['Flight', 'Train', 'Bus', 'Car/Cab', 'Bike']

function getDestinationInfo(destination) {
  const key = Object.keys(DESTINATIONS).find(k => destination.toLowerCase().includes(k.toLowerCase()))
  return key ? DESTINATIONS[key] : DESTINATIONS['DEFAULT']
}

function cyclicPick(arr, index) {
  return arr[index % arr.length]
}

function generatePlan({ source, destination, startDate, endDate, budget, numTravelers, groupType, preferences = [] }) {
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 3
  const info = getDestinationInfo(destination)
  const budgetNum = Number(budget)

  // Transport options
  const transport_options = TRANSPORT_MODES.slice(0, 4).map((mode, i) => {
    const base = budgetNum * [0.15, 0.10, 0.06, 0.12][i]
    const total = Math.round(base)
    return {
      mode,
      cost_per_person: Math.round(total / numTravelers),
      total_cost: total,
      comfort: ['high', 'medium', 'low', 'medium'][i],
      duration: ['1-2h', '4-12h', '6-14h', '3-8h'][i],
      recommended: i === 0,
    }
  })

  // Hotel options
  const hotelTiers = [
    { tier: 'budget',   mult: 0.015, rating: 3.2 },
    { tier: 'standard', mult: 0.025, rating: 4.0 },
    { tier: 'superior', mult: 0.040, rating: 4.3 },
    { tier: 'luxury',   mult: 0.065, rating: 4.7 },
  ]
  const hotel_options = hotelTiers.map(({ tier, mult, rating }, i) => {
    const pricePerNight = Math.round(budgetNum * mult)
    return {
      name:           `${['Budget', 'Standard', 'Superior', 'Luxury'][i]} Hotel ${destination}`,
      tier,
      price_per_night: pricePerNight,
      total_cost:     pricePerNight * days,
      rating,
      amenities:      ['Free WiFi', ...(i >= 1 ? ['AC'] : []), ...(i >= 2 ? ['Pool'] : []), ...(i >= 3 ? ['Spa', 'Gym'] : [])],
      location:       `Central ${destination}`,
    }
  })

  // Food plans
  const food_plans = [
    { name: 'Street Food & Local', mult: 0.006 },
    { name: 'Mid-range Restaurants', mult: 0.012 },
    { name: 'Premium Dining', mult: 0.020 },
  ].map(({ name, mult }) => {
    const costPerDay = Math.round(budgetNum * mult * numTravelers)
    return {
      name,
      cost_per_day: costPerDay,
      total_cost: costPerDay * days,
      highlights: ['Local cuisine', 'Snacks & beverages'],
    }
  })

  // Itinerary
  const places = info.places
  const slots = ['morning', 'afternoon', 'evening']
  const itinerary = Array.from({ length: days }, (_, dayIndex) => {
    const dateObj = new Date(startDate)
    dateObj.setDate(dateObj.getDate() + dayIndex)
    const dateStr = dateObj.toISOString().split('T')[0]

    const dayData = { day: dayIndex + 1, date: dateStr }
    slots.forEach(slot => {
      const activities = [0, 1, 2].map(j => {
        const placeIndex = dayIndex * 3 * 3 + slots.indexOf(slot) * 3 + j
        const place = cyclicPick(places, placeIndex)
        return {
          name: place,
          type: ['sightseeing', 'adventure', 'culture', 'food', 'leisure'][placeIndex % 5],
          duration: `${1 + (j % 3)}h`,
          cost: Math.round(budgetNum * 0.004),
          description: `Visit ${place} — one of the must-see spots in ${destination}`,
        }
      })
      dayData[slot] = { activities }
    })
    return dayData
  })

  // AI suggestions
  const ai_suggestions = [
    { type: 'tip',      icon: '💡', title: 'Best time to visit',     description: `${destination} is best visited during peak season for optimal weather.` },
    { type: 'warning',  icon: '⚠️', title: 'Book in advance',        description: 'Hotels and transport fill up fast. Book at least 2 weeks ahead.' },
    { type: 'upgrade',  icon: '⭐', title: 'Budget left?',           description: 'Consider upgrading your hotel for a more comfortable stay.' },
    { type: 'adventure',icon: '🏕️', title: 'Local experience',       description: `Try a local cooking class or guided tour of ${destination}'s hidden gems.` },
  ]

  const transport_base = transport_options[0].total_cost
  const hotel_base     = hotel_options[1].total_cost
  const food_base      = food_plans[0].total_cost
  const activities_total = itinerary.reduce((sum, day) =>
    sum + ['morning', 'afternoon', 'evening'].reduce((s, slot) =>
      s + day[slot].activities.reduce((a, act) => a + act.cost, 0), 0), 0)

  return {
    meta: {
      destination,
      source,
      total_days: days,
      total_budget: budgetNum,
      theme: info.theme,
      tags: [info.theme, groupType, ...preferences.slice(0, 2)],
    },
    transport_options,
    hotel_options,
    food_plans,
    itinerary,
    ai_suggestions,
    budget_breakdown_estimate: {
      transport:  transport_base,
      stay:       hotel_base,
      food:       food_base,
      activities: activities_total,
      misc:       Math.max(0, budgetNum - transport_base - hotel_base - food_base - activities_total),
    },
    ui: {
      color_primary:   info.primary,
      color_secondary: info.secondary,
      destination_vibe: info.vibe,
    },
    _isFallback: true,
  }
}

module.exports = { generatePlan }
