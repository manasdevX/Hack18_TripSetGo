// server/src/services/es.sync.js
// ─────────────────────────────────────────────────────────────────────────────
// Mongoose post-hook sync: keeps Elasticsearch in sync with MongoDB writes.
//
// Register this module once with require('./services/es.sync') in server.js.
// It patches the Mongoose models in-place, so the hooks are active for every
// subsequent save / remove / findOneAndDelete regardless of which controller
// calls them.
// ─────────────────────────────────────────────────────────────────────────────
const logger = require('../utils/logger')

const {
  INDICES,
  indexDocument,
  deleteDocument,
  shapeHotel,
  shapeRestaurant,
  shapeAttraction,
  shapeReview,
} = require('./elasticsearch.service')

// ── Generic hook factory ─────────────────────────────────────────────────────

/**
 * Register post-save and post-remove hooks on a Mongoose schema.
 *
 * @param {mongoose.Schema} schema  - The schema to patch
 * @param {string}          index   - Target ES index name (from INDICES)
 * @param {Function}        shaper  - (mongoDoc) => esBody
 */
const registerSyncHooks = (schema, index, shaper) => {
  // ── post save (create + update) ────────────────────────────────────────
  schema.post('save', async function (doc) {
    try {
      await indexDocument(index, doc._id.toString(), shaper(doc.toObject ? doc.toObject() : doc))
    } catch (err) {
      logger.error(`[ES Sync] post-save failed (${index}/${doc._id}): ${err.message}`)
    }
  })

  // ── post findOneAndUpdate ──────────────────────────────────────────────
  schema.post('findOneAndUpdate', async function (doc) {
    if (!doc) return
    try {
      await indexDocument(index, doc._id.toString(), shaper(doc.toObject ? doc.toObject() : doc))
    } catch (err) {
      logger.error(`[ES Sync] post-findOneAndUpdate failed (${index}/${doc._id}): ${err.message}`)
    }
  })

  // ── post remove (Mongoose 6+ doc.deleteOne()) ──────────────────────────
  schema.post('deleteOne', { document: true, query: false }, async function (doc) {
    try {
      await deleteDocument(index, doc._id.toString())
    } catch (err) {
      logger.error(`[ES Sync] post-deleteOne failed (${index}/${doc._id}): ${err.message}`)
    }
  })

  // ── post findOneAndDelete ──────────────────────────────────────────────
  schema.post('findOneAndDelete', async function (doc) {
    if (!doc) return
    try {
      await deleteDocument(index, doc._id.toString())
    } catch (err) {
      logger.error(`[ES Sync] post-findOneAndDelete failed (${index}/${doc._id}): ${err.message}`)
    }
  })
}

// ── Patch models ─────────────────────────────────────────────────────────────
// Require models after defining helpers to avoid circular deps.

const Hotel      = require('../models/Hotel.model')
const Restaurant = require('../models/Restaurant.model')
const Attraction = require('../models/Attraction.model')
const Review     = require('../models/Review.model')

registerSyncHooks(Hotel.schema,      INDICES.hotels,      shapeHotel)
registerSyncHooks(Restaurant.schema, INDICES.restaurants, shapeRestaurant)
registerSyncHooks(Attraction.schema, INDICES.attractions, shapeAttraction)
registerSyncHooks(Review.schema,     INDICES.reviews,     shapeReview)

logger.info('[ES Sync] Mongoose ↔ Elasticsearch sync hooks registered for Hotels, Restaurants, Attractions, Reviews')
