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
    weather: {
      best_season: 'October to March',
      temp_range: info.theme === 'mountains' ? '5-22°C' : '20-32°C',
      note: `Expect ${info.theme === 'mountains' ? 'cool evenings — carry warm layers' : info.theme === 'beach' ? 'sun and humidity — stay hydrated' : 'pleasant but variable weather'} in ${destination}.`,
    },
    packing_list: [
      'Comfortable walking shoes',
      'Weather-appropriate clothing',
      'Power bank + phone charger',
      'Reusable water bottle',
      'Valid ID / travel documents',
      'Basic first-aid & medication',
      ...(info.theme === 'beach' ? ['Sunscreen SPF 50+', 'Swimwear'] : info.theme === 'mountains' ? ['Warm jacket', 'Rain layer'] : ['Sunglasses', 'Light jacket']),
    ],
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

/**
 * Deterministic fallback for POST /api/v1/planner/generate.
 * Returns the same schema as generateDetailedPlan() so consumers
 * always get a consistent structure regardless of whether Gemini is available.
 */
function generateDetailedFallback({ destination, budget, days, interests = [] }) {
  const info = getDestinationInfo(destination)
  const budgetNum = Number(budget)
  const today = new Date()

  const slots = ['morning', 'afternoon', 'evening']
  const slotTimes = { morning: '09:00 - 12:00', afternoon: '13:00 - 17:00', evening: '18:00 - 21:00' }
  const places = info.places

  const itinerary = Array.from({ length: days }, (_, dayIndex) => {
    const dayObj = { day: dayIndex + 1, theme: `Day ${dayIndex + 1} — ${destination} Exploration` }
    slots.forEach(slot => {
      const placeIndex = dayIndex * 3 + slots.indexOf(slot)
      const place = cyclicPick(places, placeIndex)
      dayObj[slot] = {
        time: slotTimes[slot],
        activity: place,
        description: `Explore ${place}, one of ${destination}'s iconic spots. A great way to experience the local culture and scenery.`,
        estimated_cost: Math.round(budgetNum * 0.012),
        tips: `Visit early to avoid crowds and get the best experience at ${place}.`,
      }
    })
    return dayObj
  })

  const recommended_attractions = places.slice(0, 5).map((name, i) => ({
    name,
    category: ['Heritage', 'Nature', 'Adventure', 'Spiritual', 'Entertainment'][i % 5],
    description: `${name} is a must-visit landmark in ${destination}. It offers a unique blend of local history and natural beauty.`,
    entry_fee: Math.round(budgetNum * 0.005),
    best_time: slots[i % 3],
    duration: `${1 + (i % 3)} hours`,
    must_see: i < 3,
  }))

  const cuisines = ['Local', 'Street Food', 'Indian', 'Continental', 'Regional']
  const recommended_restaurants = cuisines.map((cuisine, i) => ({
    name: `${['The Local', 'Street Bites', 'Desi Tadka', 'Grand Cafe', 'Heritage Kitchen'][i]} — ${destination}`,
    cuisine,
    specialty: `Signature ${cuisine} dishes`,
    price_range: ['budget', 'budget', 'moderate', 'moderate', 'upscale'][i],
    avg_cost_per_person: Math.round(budgetNum * [0.008, 0.005, 0.012, 0.015, 0.025][i]),
    meal_type: ['all-day', 'breakfast', 'lunch', 'dinner', 'dinner'][i],
    local_tip: `Try their signature dish for the most authentic taste of ${destination}.`,
  }))

  const transportCost  = Math.round(budgetNum * 0.15)
  const hotelCost      = Math.round(budgetNum * 0.30)
  const foodCost       = Math.round(budgetNum * 0.20)
  const attractionsCost = Math.round(budgetNum * 0.15)
  const miscCost       = Math.max(0, budgetNum - transportCost - hotelCost - foodCost - attractionsCost)

  return {
    meta: {
      destination,
      days,
      budget: budgetNum,
      theme: info.theme,
      best_time_to_visit: 'October to March',
      tags: [info.theme, ...interests.slice(0, 2), 'india'],
    },
    estimated_cost: {
      accommodation: hotelCost,
      food:          foodCost,
      transport:     transportCost,
      attractions:   attractionsCost,
      shopping_misc: miscCost,
      total:         budgetNum,
      currency:      'INR',
      note:          'Book transport and hotels in advance to stay within budget.',
    },
    itinerary,
    recommended_attractions,
    recommended_restaurants,
    packing_suggestions: {
      clothing:      ['Comfortable walking shoes', 'Light cotton clothes', 'Formal wear (1 set)'],
      essentials:    ['Valid ID / passport', 'Cash + UPI-enabled phone', 'Travel insurance'],
      documents:     ['Booking confirmations', 'Emergency contacts'],
      tech:          ['Phone charger + power bank', 'Earphones'],
      health_safety: ['Basic first-aid kit', 'Prescribed medications', 'Sunscreen SPF 50+'],
      weather_note:  `${destination} weather is generally pleasant. Carry a light jacket for evenings.`,
    },
    local_tips: [
      { icon: '💡', tip: `Book popular attractions at ${destination} online to skip queues.` },
      { icon: '🚕', tip: 'Use Ola/Uber or pre-paid autos for safe and metered fares.' },
      { icon: '💧', tip: 'Carry a reusable water bottle — stay hydrated during sightseeing.' },
      { icon: '📸', tip: 'Best photography spots are early morning before crowds arrive.' },
      { icon: '🍽️', tip: `Try the local street food — ${destination} is famous for its regional flavours.` },
    ],
    _isFallback: true,
  }
}

/**
 * Deterministic single-day regeneration for the Planner's "regenerate day"
 * action. Returns one day in the same shape generateTripPlan() produces
 * (morning/afternoon/evening → activities[]). Prefers places not already used
 * (`avoid`) and rotates randomly so repeated regenerations differ.
 */
function regenerateDayFallback({ destination, dayNumber, budget, avoid = [] }) {
  const info = getDestinationInfo(destination)
  const budgetNum = Number(budget) || 0
  const slots = ['morning', 'afternoon', 'evening']

  const avoidSet = new Set((avoid || []).map((s) => String(s).toLowerCase()))
  let pool = info.places.filter((p) => !avoidSet.has(p.toLowerCase()))
  if (pool.length === 0) pool = info.places // everything was avoided — reuse the full list
  // (with a small place list the pool cycles, but still avoids used places where possible)

  const offset = Math.floor(Math.random() * pool.length)

  const day = { day: Number(dayNumber), theme: `Day ${dayNumber} — ${destination} (refreshed)` }
  slots.forEach((slot, sIdx) => {
    const activities = [0, 1, 2].map((j) => {
      const idx = offset + sIdx * 3 + j
      const place = cyclicPick(pool, idx)
      return {
        name: place,
        type: ['sightseeing', 'adventure', 'culture', 'food', 'leisure'][idx % 5],
        duration: `${1 + (j % 3)}h`,
        cost: Math.round(budgetNum * 0.004),
        description: `Explore ${place} — a fresh pick for day ${dayNumber} in ${destination}.`,
      }
    })
    day[slot] = { activities }
  })
  return day
}

module.exports = { generatePlan, generateDetailedFallback, regenerateDayFallback }
