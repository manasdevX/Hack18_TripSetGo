// server/src/models/Attraction.model.js
// ─────────────────────────────────────────────────────────────────────────────
// Extended Attraction model with OpenTripMap fields for the Attractions
// Discovery Service. Persists normalised data from OTM (and other providers).
//
// Persistence strategy:
//   - Primary key: `xid` (OTM unique ID) — upserted via bulkWrite
//   - Geospatial: 2dsphere index on `location` for nearby queries
//   - Compound indexes: (city, popularityScore), (city, category)
//   - Staleness: `lastFetchedAt` — re-fetch from OTM if older than 24h
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose')

const attractionSchema = new mongoose.Schema({
  // ── Core fields (original) ─────────────────────────────────────────────
  name: {
    type:     String,
    required: true,
    trim:     true,
    index:    true,
  },
  category: {
    type:     String,
    required: true,
    index:    true,
    // e.g. Heritage, Culture, Nature, Viewpoint, Sightseeing, Spiritual, Entertainment, Food
  },
  description: {
    type: String,
    default: null,
  },
  location: {
    type:        { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  city: {
    type:     String,
    required: true,
    index:    true,
    trim:     true,
  },
  recommendedDuration: {
    type: Number,
    default: null,
  }, // in minutes
  ticketPrice: {
    type:    Number,
    default: null,
  },
  averageRating: {
    type:    Number,
    default: 0,
    min:     0,
    max:     5,
  },
  reviewCount: {
    type:    Number,
    default: 0,
  },
  images: [{ type: String }],

  // ── OpenTripMap-specific fields ────────────────────────────────────────
  /**
   * OTM unique identifier (e.g. "Q133182", "W12345678").
   * Used as the primary upsert key for OTM-sourced records.
   * Sparse to allow non-OTM documents without an xid.
   */
  xid: {
    type:   String,
    index:  true,
    sparse: true, // allows multiple null documents
    unique: true,
    trim:   true,
  },

  /**
   * Data source provider (e.g. 'OpenTripMap', 'OpenStreetMap', 'Foursquare').
   */
  source: {
    type:    String,
    default: 'OpenTripMap',
    index:   true,
  },

  /**
   * Popularity score 0–100 derived from OTM `rate` field:
   *   rate 0   → 0   (unrated)
   *   rate 1   → 25  (minor interest)
   *   rate 2   → 50  (notable)
   *   rate 3   → 75  (popular)
   *   rate 3h  → 100 (heritage / highly important)
   */
  popularityScore: {
    type:    Number,
    default: 0,
    min:     0,
    max:     100,
    index:   true,
  },

  /**
   * OTM category kinds — comma-separated tags e.g. ['museums', 'cultural', 'interesting_places']
   */
  kinds: {
    type:    [String],
    default: [],
    index:   true,
  },

  /**
   * Attraction website URL.
   */
  website: {
    type:    String,
    default: null,
  },

  /**
   * Wikidata entity ID (e.g. "Q42").
   */
  wikidata: {
    type:    String,
    default: null,
    sparse:  true,
    index:   true,
  },

  /**
   * Wikipedia article slug (e.g. "en:Taj_Mahal").
   */
  wikipedia: {
    type:    String,
    default: null,
  },

  /**
   * Formatted address string.
   */
  address: {
    type:    String,
    default: null,
  },

  /**
   * Contact phone number.
   */
  phone: {
    type:    String,
    default: null,
  },

  /**
   * Opening hours string (e.g. "Mo-Su 09:00-17:00").
   */
  openingHours: {
    type:    String,
    default: null,
  },

  /**
   * Timestamp of last successful OTM fetch.
   * Used to determine if a DB-cached record is still fresh (< 24h).
   */
  lastFetchedAt: {
    type:    Date,
    default: null,
    index:   true,
  },

}, { timestamps: true })

// ── Indexes ───────────────────────────────────────────────────────────────────

// Geospatial queries: nearby attractions
attractionSchema.index({ location: '2dsphere' })

// City + category browsing (e.g. "museums in Jaipur")
attractionSchema.index({ city: 1, category: 1 })

// City + popularity ranking (default sort for city searches)
attractionSchema.index({ city: 1, popularityScore: -1 })

// Global popularity leaderboard
attractionSchema.index({ popularityScore: -1 })

// Text search across name and description
attractionSchema.index({ name: 'text', description: 'text' })

// ── Virtual ───────────────────────────────────────────────────────────────────

/**
 * isStale: true if lastFetchedAt is older than 24 hours.
 */
attractionSchema.virtual('isStale').get(function () {
  if (!this.lastFetchedAt) return true
  return Date.now() - this.lastFetchedAt.getTime() > 24 * 60 * 60 * 1000
})

module.exports = mongoose.model('Attraction', attractionSchema)
