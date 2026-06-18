// server/src/scripts/esIndex.js
// ─────────────────────────────────────────────────────────────────────────────
// One-shot seeder: drops and recreates all ES indices, then bulk-imports all
// existing MongoDB documents.
//
// Usage:
//   node src/scripts/esIndex.js
//
// Options (env vars):
//   SEED_BATCH_SIZE=200   Documents per bulk request (default: 200)
//   SEED_DROP=true        Drop + recreate indices before seeding (default: true)
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const mongoose   = require('mongoose')
const logger     = require('../utils/logger')

const Hotel      = require('../models/Hotel.model')
const Restaurant = require('../models/Restaurant.model')
const Attraction = require('../models/Attraction.model')
const Review     = require('../models/Review.model')

const {
  INDICES,
  createIndices,
  dropIndices,
  bulkIndex,
  shapeHotel,
  shapeRestaurant,
  shapeAttraction,
  shapeReview,
} = require('../services/elasticsearch.service')

const { pingElasticsearch } = require('../config/elasticsearch')

const BATCH_SIZE = parseInt(process.env.SEED_BATCH_SIZE, 10) || 200
const DROP_FIRST = process.env.SEED_DROP !== 'false'

// ── Batch processor ──────────────────────────────────────────────────────────

/**
 * Stream all documents from a Mongoose model, shape them, and bulk-index
 * into Elasticsearch in batches.
 *
 * @param {mongoose.Model} Model     - Mongoose model to query
 * @param {string}         index     - Target ES index name
 * @param {Function}       shaper    - Doc → ES body function
 * @param {string}         label     - Human-readable label for logging
 */
const seedModel = async (Model, index, shaper, label) => {
  logger.info(`[Seeder] Indexing ${label}...`)

  const total   = await Model.countDocuments()
  let   indexed = 0
  let   errors  = 0
  let   skip    = 0

  while (skip < total) {
    const batch = await Model.find({}).skip(skip).limit(BATCH_SIZE).lean()
    if (!batch.length) break

    const shaped = batch.map(shaper)
    const result = await bulkIndex(index, shaped)

    indexed += result.indexed
    errors  += result.errors
    skip    += batch.length

    const pct = Math.round((skip / total) * 100)
    logger.info(`[Seeder] ${label}: ${skip}/${total} (${pct}%) — indexed ${result.indexed}, errors ${result.errors}`)
  }

  logger.info(`[Seeder] ✅ ${label} done: ${indexed} indexed, ${errors} errors (out of ${total} total)`)
  return { indexed, errors, total }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const main = async () => {
  const startTime = Date.now()

  // 1. Connect to MongoDB
  logger.info('[Seeder] Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)
  logger.info('[Seeder] ✅ MongoDB connected')

  // 2. Verify Elasticsearch
  const esOk = await pingElasticsearch()
  if (!esOk) {
    logger.error('[Seeder] ❌ Cannot reach Elasticsearch. Aborting.')
    process.exit(1)
  }

  // 3. (Re)create indices
  if (DROP_FIRST) {
    logger.info('[Seeder] Dropping existing indices...')
    await dropIndices()
  }
  logger.info('[Seeder] Creating indices...')
  await createIndices()

  // 4. Seed each collection
  const results = await Promise.all([
    seedModel(Hotel,      INDICES.hotels,      shapeHotel,      'Hotels'),
    seedModel(Restaurant, INDICES.restaurants, shapeRestaurant, 'Restaurants'),
    seedModel(Attraction, INDICES.attractions, shapeAttraction, 'Attractions'),
    seedModel(Review,     INDICES.reviews,     shapeReview,     'Reviews'),
  ])

  // 5. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const totals  = results.reduce(
    (acc, r) => ({ indexed: acc.indexed + r.indexed, errors: acc.errors + r.errors, total: acc.total + r.total }),
    { indexed: 0, errors: 0, total: 0 }
  )

  logger.info('─'.repeat(60))
  logger.info(`[Seeder] 🎉 Seeding complete in ${elapsed}s`)
  logger.info(`[Seeder]    Total documents : ${totals.total}`)
  logger.info(`[Seeder]    Successfully    : ${totals.indexed}`)
  logger.info(`[Seeder]    Errors          : ${totals.errors}`)
  logger.info('─'.repeat(60))

  await mongoose.disconnect()
  process.exit(0)
}

main().catch((err) => {
  logger.error(`[Seeder] Fatal error: ${err.message}`)
  logger.error(err.stack)
  process.exit(1)
})
