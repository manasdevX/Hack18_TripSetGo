// backend/src/services/travel/adapters/amadeus.flight.adapter.js
// ─────────────────────────────────────────────────────────────────────────────
// Normalises Amadeus Flight APIs (v2) responses into consistent schemas.
//
// Endpoints covered:
//   GET /v2/shopping/flight-offers          — flight search
//   POST /v1/shopping/flight-offers/pricing — confirmed pricing
//   GET /v1/reference-data/locations        — airport autocomplete
//   GET /v1/airlines                        — airline name lookup
//
// Amadeus Flight Offer structure (simplified):
//   {
//     id, source, itineraries: [{ duration, segments: [{
//       departure: {iataCode, terminal, at},
//       arrival:   {iataCode, terminal, at},
//       carrierCode, number, aircraft: {code},
//       duration, numberOfStops
//     }]}],
//     travelerPricings: [{fareOption, travelerType, price: {currency, total},
//       fareDetailsBySegment: [{cabin, brandedFare, class}]}],
//     price: {currency, total, base, fees: [{amount, type}], grandTotal},
//     pricingOptions: {includedCheckedBagsOnly},
//     validatingAirlineCodes, numberOfBookableSeats
//   }
// ─────────────────────────────────────────────────────────────────────────────

// ── Airline IATA code → full name (top carriers, fallback to API) ─────────────
const AIRLINE_NAMES = {
  '6E': 'IndiGo',
  'AI': 'Air India',
  'SG': 'SpiceJet',
  'G8': 'Go First',
  'UK': 'Vistara',
  'IX': 'Air Asia India',
  'I5': 'Air Asia India',
  'QP': 'Akasa Air',
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'EY': 'Etihad Airways',
  'LH': 'Lufthansa',
  'BA': 'British Airways',
  'SQ': 'Singapore Airlines',
  'TG': 'Thai Airways',
  'MH': 'Malaysia Airlines',
  'CX': 'Cathay Pacific',
  'AF': 'Air France',
  'KL': 'KLM',
  'UA': 'United Airlines',
  'AA': 'American Airlines',
  'DL': 'Delta Air Lines',
  '9W': 'Jet Airways',
  'G9': 'Air Arabia',
  'FZ': 'Flydubai',
  'TR': 'Scoot',
  'VJ': 'VietJet Air',
  'AK': 'AirAsia',
}

// ── Aircraft type codes ────────────────────────────────────────────────────────
const AIRCRAFT_NAMES = {
  '320': 'Airbus A320',
  '321': 'Airbus A321',
  '319': 'Airbus A319',
  '32A': 'Airbus A320neo',
  '32B': 'Airbus A321neo',
  '738': 'Boeing 737-800',
  '739': 'Boeing 737-900',
  '73H': 'Boeing 737-800',
  '789': 'Boeing 787-9 Dreamliner',
  '788': 'Boeing 787-8 Dreamliner',
  '77W': 'Boeing 777-300ER',
  '77L': 'Boeing 777-200LR',
  '359': 'Airbus A350-900',
  '388': 'Airbus A380',
  'E90': 'Embraer 190',
  'AT7': 'ATR 72',
  'AT4': 'ATR 42',
}

// ── Cabin class map ───────────────────────────────────────────────────────────
const CABIN_MAP = {
  ECONOMY:          'Economy',
  PREMIUM_ECONOMY:  'Premium Economy',
  BUSINESS:         'Business',
  FIRST:            'First Class',
}

// ── Duration string → minutes → human string ─────────────────────────────────

/**
 * Parse ISO 8601 duration (e.g. "PT2H45M") into total minutes.
 * @param {string} iso
 * @returns {number}
 */
function parseDurationToMinutes(iso) {
  if (!iso) return 0
  const hours   = (iso.match(/(\d+)H/) || [])[1] || 0
  const minutes = (iso.match(/(\d+)M/) || [])[1] || 0
  return parseInt(hours) * 60 + parseInt(minutes)
}

/**
 * Format total minutes into a human-readable string (e.g. "2h 45m").
 * @param {number} totalMinutes
 * @returns {string}
 */
function formatDuration(totalMinutes) {
  if (!totalMinutes) return null
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Format ISO duration to human readable directly.
 * @param {string} iso
 * @returns {string}
 */
function formatIsoDuration(iso) {
  return formatDuration(parseDurationToMinutes(iso))
}

// ── Price helpers ─────────────────────────────────────────────────────────────

const USD_TO_INR = 83.5  // approximate; replace with live FX in production

function priceToINR(amount, currency) {
  const num = parseFloat(amount) || 0
  if (!currency || currency === 'INR') return Math.round(num)
  if (currency === 'USD') return Math.round(num * USD_TO_INR)
  if (currency === 'EUR') return Math.round(num * 90.0)
  if (currency === 'GBP') return Math.round(num * 106.0)
  if (currency === 'SGD') return Math.round(num * 62.0)
  if (currency === 'AED') return Math.round(num * 22.7)
  return Math.round(num * USD_TO_INR) // fallback: treat as USD
}

// ── Airline helper ────────────────────────────────────────────────────────────

function getAirlineName(code) {
  return AIRLINE_NAMES[code] || code
}

function getAircraftName(code) {
  return AIRCRAFT_NAMES[code] || code
}

// ── Segment normaliser ────────────────────────────────────────────────────────

/**
 * Normalise a single flight segment (one leg of the journey).
 * @param {Object} seg — Amadeus segment object
 * @returns {NormalisedSegment}
 */
function normaliseSegment(seg) {
  const durationMin = parseDurationToMinutes(seg.duration)

  return {
    departure: {
      airport:   seg.departure?.iataCode,
      terminal:  seg.departure?.terminal || null,
      at:        seg.departure?.at,          // ISO datetime
      dateLocal: seg.departure?.at?.split('T')[0] || null,
      timeLocal: seg.departure?.at?.split('T')[1]?.slice(0, 5) || null,
    },
    arrival: {
      airport:   seg.arrival?.iataCode,
      terminal:  seg.arrival?.terminal || null,
      at:        seg.arrival?.at,
      dateLocal: seg.arrival?.at?.split('T')[0] || null,
      timeLocal: seg.arrival?.at?.split('T')[1]?.slice(0, 5) || null,
    },
    airline: {
      code: seg.carrierCode,
      name: getAirlineName(seg.carrierCode),
    },
    flightNumber:  `${seg.carrierCode}${seg.number}`,
    aircraft: {
      code: seg.aircraft?.code,
      name: getAircraftName(seg.aircraft?.code),
    },
    durationMin,
    durationLabel:  formatDuration(durationMin),
    numberOfStops:  seg.numberOfStops || 0,
    operatingAirline: seg.operating?.carrierCode
      ? { code: seg.operating.carrierCode, name: getAirlineName(seg.operating.carrierCode) }
      : null,
  }
}

// ── Itinerary normaliser ──────────────────────────────────────────────────────

/**
 * Normalise a single itinerary (outbound or return).
 * @param {Object} itin — Amadeus itinerary object
 * @param {number} index — 0 = outbound, 1 = return
 * @returns {NormalisedItinerary}
 */
function normaliseItinerary(itin, index = 0) {
  const segments    = (itin.segments || []).map(normaliseSegment)
  const totalMin    = parseDurationToMinutes(itin.duration)
  const stops       = segments.length - 1
  const firstSeg    = segments[0]
  const lastSeg     = segments[segments.length - 1]

  // Layover airports (all airports except origin and final destination)
  const layovers = segments.slice(0, -1).map(s => s.arrival.airport).filter(Boolean)

  return {
    direction:      index === 0 ? 'outbound' : 'return',
    durationMin:    totalMin,
    durationLabel:  formatDuration(totalMin),
    stops,
    stopsLabel:     stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`,
    layoverAirports: layovers,
    departure: firstSeg?.departure || null,
    arrival:   lastSeg?.arrival   || null,
    segments,
  }
}

// ── Main flight offer normaliser ──────────────────────────────────────────────

/**
 * Normalise a single Amadeus flight offer.
 * @param {Object} offer — Amadeus flight-offer object
 * @returns {NormalisedFlightOffer}
 */
function normalise(offer) {
  if (!offer?.id) return null

  const itineraries = (offer.itineraries || []).map(normaliseItinerary)
  const outbound    = itineraries[0] || null
  const returnLeg   = itineraries[1] || null

  const currency    = offer.price?.currency || 'USD'
  const totalRaw    = parseFloat(offer.price?.grandTotal || offer.price?.total) || 0
  const baseRaw     = parseFloat(offer.price?.base) || 0
  const totalINR    = priceToINR(totalRaw, currency)
  const baseINR     = priceToINR(baseRaw, currency)
  const taxINR      = totalINR - baseINR

  // Fees breakdown
  const fees = (offer.price?.fees || []).map(f => ({
    type:   f.type,
    amount: parseFloat(f.amount) || 0,
    amountINR: priceToINR(parseFloat(f.amount) || 0, currency),
  }))

  // Per-traveller pricing
  const travelerPricings = (offer.travelerPricings || []).map(tp => ({
    travelerType: tp.travelerType,
    fareOption:   tp.fareOption,
    totalINR:     priceToINR(parseFloat(tp.price?.total) || 0, tp.price?.currency || currency),
    cabin:        tp.fareDetailsBySegment?.[0]?.cabin || null,
    cabinLabel:   CABIN_MAP[tp.fareDetailsBySegment?.[0]?.cabin] || tp.fareDetailsBySegment?.[0]?.cabin || null,
    brandedFare:  tp.fareDetailsBySegment?.[0]?.brandedFare || null,
    class:        tp.fareDetailsBySegment?.[0]?.class || null,
    includedBags: tp.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity ?? null,
  }))

  // Main cabin (from first traveller, first segment)
  const mainCabin = travelerPricings[0]?.cabin
  const seatsLeft = offer.numberOfBookableSeats

  return {
    id:               offer.id,
    source:           'Amadeus',

    // Airlines
    validatingAirline: {
      code: offer.validatingAirlineCodes?.[0],
      name: getAirlineName(offer.validatingAirlineCodes?.[0]),
    },

    // Price
    totalINR,
    baseINR,
    taxINR,
    currency,
    originalTotal:   totalRaw,
    fees,
    pricePerTraveler: travelerPricings[0]?.totalINR || totalINR,

    // Seat availability
    seatsLeft:       seatsLeft ?? null,
    seatsLeftLabel:  seatsLeft != null && seatsLeft <= 5 ? `Only ${seatsLeft} left!` : null,

    // Cabin
    cabin:      mainCabin,
    cabinLabel: CABIN_MAP[mainCabin] || mainCabin || null,

    // Itineraries
    outbound,
    return:     returnLeg,
    isRoundTrip: !!returnLeg,

    // Quick-access fields (from outbound)
    origin:      outbound?.departure?.airport || null,
    destination: outbound?.arrival?.airport   || null,
    departureAt: outbound?.departure?.at       || null,
    arrivalAt:   outbound?.arrival?.at         || null,
    stops:       outbound?.stops ?? null,
    stopsLabel:  outbound?.stopsLabel || null,
    durationMin: outbound?.durationMin || null,
    durationLabel: outbound?.durationLabel || null,

    // Traveller breakdown
    travelerPricings,

    // Baggage
    includedCheckedBags: travelerPricings[0]?.includedBags,

    // PricingOptions
    refundable: offer.pricingOptions?.refundableFare ?? null,
    instantTicket: offer.pricingOptions?.instantTicketingRequired ?? false,
  }
}

/**
 * Normalise array of flight offers. Deduplicates by id.
 * @param {Object[]} offers
 * @returns {NormalisedFlightOffer[]}
 */
function normaliseMany(offers = []) {
  const seen = new Set()
  return offers
    .filter(o => {
      if (!o?.id || seen.has(o.id)) return false
      seen.add(o.id)
      return true
    })
    .map(normalise)
    .filter(Boolean)
}

// ── Airport location normaliser ───────────────────────────────────────────────

/**
 * Normalise Amadeus /v1/reference-data/locations result for airport autocomplete.
 * @param {Object} loc — Amadeus location object
 * @returns {NormalisedAirport}
 */
function normaliseAirport(loc) {
  return {
    iataCode:    loc.iataCode,
    icaoCode:    loc.icaoCode || null,
    name:        loc.name || loc.detailedName || loc.iataCode,
    detailedName: loc.detailedName || null,
    cityName:    loc.address?.cityName || null,
    cityCode:    loc.address?.cityCode || null,
    countryName: loc.address?.countryName || null,
    countryCode: loc.address?.countryCode || null,
    regionCode:  loc.address?.regionCode || null,
    type:        loc.subType || 'AIRPORT',
    relevance:   loc.relevance || null,
    coordinates: loc.geoCode ? { lat: loc.geoCode.latitude, lon: loc.geoCode.longitude } : null,
  }
}

function normaliseAirports(locations = []) {
  return locations
    .filter(l => l.iataCode)
    .map(normaliseAirport)
}

// ── Airline detail normaliser ─────────────────────────────────────────────────

/**
 * Normalise Amadeus /v1/airlines result.
 * @param {Object} airline
 * @returns {NormalisedAirline}
 */
function normaliseAirline(airline) {
  return {
    iataCode:  airline.iataCode,
    icaoCode:  airline.icaoCode || null,
    name:      airline.commonName || airline.businessName || getAirlineName(airline.iataCode),
    businessName: airline.businessName || null,
  }
}

function normaliseAirlines(airlines = []) {
  return airlines.filter(a => a.iataCode).map(normaliseAirline)
}

// ── Pricing confirmation normaliser ──────────────────────────────────────────

/**
 * Normalise a confirmed price response from /v1/shopping/flight-offers/pricing.
 * Same structure as flight offer but with confirmed price.
 * @param {Object} raw — Pricing response
 * @returns {NormalisedFlightOffer | null}
 */
function normalisePricingConfirmation(raw) {
  const offer = raw?.data?.flightOffers?.[0]
  if (!offer) return null
  return normalise(offer)
}

module.exports = {
  normalise,
  normaliseMany,
  normaliseAirport,
  normaliseAirports,
  normaliseAirline,
  normaliseAirlines,
  normalisePricingConfirmation,
  parseDurationToMinutes,
  formatDuration,
  formatIsoDuration,
  priceToINR,
  getAirlineName,
}
