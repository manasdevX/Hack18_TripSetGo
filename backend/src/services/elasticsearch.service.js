// server/src/services/elasticsearch.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Core Elasticsearch service for TripSetGo.
//
// Features:
//   • Index management  — create / drop indices with rich mappings
//   • Bulk indexing     — seed from MongoDB in one pass
//   • Full-text search  — multi_match on boosted fields
//   • Fuzzy search      — tolerance for typos (fuzziness: AUTO)
//   • Autocomplete      — search_as_you_type prefix matching
//   • Suggest           — completion suggester
//   • Relevance ranking — BM25 × function_score (averageRating boost)
// ─────────────────────────────────────────────────────────────────────────────
const { esClient } = require('../config/elasticsearch')
const logger = require('../utils/logger')

// ── Index names ──────────────────────────────────────────────────────────────
const INDICES = {
  hotels:      'tripsetgo_hotels',
  restaurants: 'tripsetgo_restaurants',
  attractions: 'tripsetgo_attractions',
  reviews:     'tripsetgo_reviews',
}

// ── Index Mappings ───────────────────────────────────────────────────────────
const MAPPINGS = {
  // ── Hotels ──────────────────────────────────────────────────────────────
  [INDICES.hotels]: {
    mappings: {
      properties: {
        mongoId:       { type: 'keyword' },
        name:          { type: 'search_as_you_type' },
        description:   { type: 'text', analyzer: 'english' },
        city:          { type: 'keyword', fields: { text: { type: 'text' } } },
        country:       { type: 'keyword', fields: { text: { type: 'text' } } },
        address:       { type: 'text' },
        starRating:    { type: 'float' },
        priceLevel:    { type: 'float' },
        amenities:     { type: 'keyword' },
        averageRating: { type: 'float' },
        reviewCount:   { type: 'integer' },
        images:        { type: 'keyword', index: false },
        location: {
          type: 'geo_point',
        },
        suggest: {
          type: 'completion',
          analyzer: 'simple',
          search_analyzer: 'simple',
        },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
    settings: {
      number_of_shards:   1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          english: {
            tokenizer: 'standard',
            filter: ['lowercase', 'english_stop', 'english_stemmer'],
          },
        },
        filter: {
          english_stop:    { type: 'stop',    language: 'english' },
          english_stemmer: { type: 'stemmer', language: 'english' },
        },
      },
    },
  },

  // ── Restaurants ─────────────────────────────────────────────────────────
  [INDICES.restaurants]: {
    mappings: {
      properties: {
        mongoId:        { type: 'keyword' },
        name:           { type: 'search_as_you_type' },
        city:           { type: 'keyword', fields: { text: { type: 'text' } } },
        address:        { type: 'text' },
        cuisines:       { type: 'keyword' },
        dietaryOptions: { type: 'keyword' },
        priceLevel:     { type: 'float' },
        averageRating:  { type: 'float' },
        reviewCount:    { type: 'integer' },
        images:         { type: 'keyword', index: false },
        location: {
          type: 'geo_point',
        },
        suggest: {
          type: 'completion',
          analyzer: 'simple',
          search_analyzer: 'simple',
        },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  // ── Attractions ──────────────────────────────────────────────────────────
  [INDICES.attractions]: {
    mappings: {
      properties: {
        mongoId:             { type: 'keyword' },
        name:                { type: 'search_as_you_type' },
        description:         { type: 'text', analyzer: 'english' },
        category:            { type: 'keyword' },
        city:                { type: 'keyword', fields: { text: { type: 'text' } } },
        ticketPrice:         { type: 'float' },
        recommendedDuration: { type: 'integer' },
        averageRating:       { type: 'float' },
        reviewCount:         { type: 'integer' },
        images:              { type: 'keyword', index: false },
        location: {
          type: 'geo_point',
        },
        suggest: {
          type: 'completion',
          analyzer: 'simple',
          search_analyzer: 'simple',
        },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },

  // ── Reviews ─────────────────────────────────────────────────────────────
  [INDICES.reviews]: {
    mappings: {
      properties: {
        mongoId:         { type: 'keyword' },
        targetType:      { type: 'keyword' },
        targetId:        { type: 'keyword' },
        userId:          { type: 'keyword' },
        rating:          { type: 'float' },
        title:           { type: 'text', analyzer: 'english' },
        text:            { type: 'text', analyzer: 'english' },
        isVerifiedVisit: { type: 'boolean' },
        upvoteCount:     { type: 'integer' },
        createdAt:       { type: 'date' },
        updatedAt:       { type: 'date' },
      },
    },
    settings: { number_of_shards: 1, number_of_replicas: 0 },
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a MongoDB document coordinate array [lng, lat] into an ES geo_point
 * object { lat, lon } — ES expects lat/lon, not lng/lat.
 */
const toGeoPoint = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  return { lon: coordinates[0], lat: coordinates[1] }
}

/**
 * Shape a Hotel Mongoose document into an ES source document.
 */
const shapeHotel = (doc) => ({
  mongoId:       doc._id.toString(),
  name:          doc.name,
  description:   doc.description,
  city:          doc.city,
  country:       doc.country,
  address:       doc.address,
  starRating:    doc.starRating,
  priceLevel:    doc.priceLevel,
  amenities:     doc.amenities || [],
  averageRating: doc.averageRating,
  reviewCount:   doc.reviewCount,
  images:        doc.images || [],
  location:      doc.location?.coordinates ? toGeoPoint(doc.location.coordinates) : null,
  suggest: {
    input:  [doc.name, doc.city, doc.country].filter(Boolean),
    weight: Math.round((doc.averageRating || 0) * 20),
  },
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
})

/**
 * Shape a Restaurant Mongoose document into an ES source document.
 */
const shapeRestaurant = (doc) => ({
  mongoId:        doc._id.toString(),
  name:           doc.name,
  city:           doc.city,
  address:        doc.address,
  cuisines:       doc.cuisines || [],
  dietaryOptions: doc.dietaryOptions || [],
  priceLevel:     doc.priceLevel,
  averageRating:  doc.averageRating,
  reviewCount:    doc.reviewCount,
  images:         doc.images || [],
  location:       doc.location?.coordinates ? toGeoPoint(doc.location.coordinates) : null,
  suggest: {
    input:  [doc.name, ...( doc.cuisines || []), doc.city].filter(Boolean),
    weight: Math.round((doc.averageRating || 0) * 20),
  },
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
})

/**
 * Shape an Attraction Mongoose document into an ES source document.
 */
const shapeAttraction = (doc) => ({
  mongoId:             doc._id.toString(),
  name:                doc.name,
  description:         doc.description,
  category:            doc.category,
  city:                doc.city,
  ticketPrice:         doc.ticketPrice,
  recommendedDuration: doc.recommendedDuration,
  averageRating:       doc.averageRating,
  reviewCount:         doc.reviewCount,
  images:              doc.images || [],
  location:            doc.location?.coordinates ? toGeoPoint(doc.location.coordinates) : null,
  suggest: {
    input:  [doc.name, doc.category, doc.city].filter(Boolean),
    weight: Math.round((doc.averageRating || 0) * 20),
  },
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
})

/**
 * Shape a Review Mongoose document into an ES source document.
 */
const shapeReview = (doc) => ({
  mongoId:         doc._id.toString(),
  targetType:      doc.targetType,
  targetId:        doc.targetId?.toString(),
  userId:          doc.userId?.toString(),
  rating:          doc.rating,
  title:           doc.title,
  text:            doc.text,
  isVerifiedVisit: doc.isVerifiedVisit,
  upvoteCount:     (doc.upvotes || []).length,
  createdAt:       doc.createdAt,
  updatedAt:       doc.updatedAt,
})

// Export shapers so the sync module can reuse them
const SHAPERS = {
  [INDICES.hotels]:      shapeHotel,
  [INDICES.restaurants]: shapeRestaurant,
  [INDICES.attractions]: shapeAttraction,
  [INDICES.reviews]:     shapeReview,
}

// ── Index Management ─────────────────────────────────────────────────────────

/**
 * Create all 4 indices if they don't already exist.
 * Called once at server startup — safe to call repeatedly.
 */
const createIndices = async () => {
  for (const [alias, indexName] of Object.entries(INDICES)) {
    try {
      const exists = await esClient.indices.exists({ index: indexName })
      if (exists) {
        logger.info(`[ES] Index "${indexName}" already exists — skipping creation`)
        continue
      }
      await esClient.indices.create({ index: indexName, body: MAPPINGS[indexName] })
      logger.info(`[ES] ✅ Index "${indexName}" created (alias: ${alias})`)
    } catch (err) {
      logger.error(`[ES] Failed to create index "${indexName}": ${err.message}`)
    }
  }
}

/**
 * Drop all TripSetGo indices — use with caution (seeder script only).
 */
const dropIndices = async () => {
  for (const indexName of Object.values(INDICES)) {
    try {
      const exists = await esClient.indices.exists({ index: indexName })
      if (exists) {
        await esClient.indices.delete({ index: indexName })
        logger.info(`[ES] Dropped index "${indexName}"`)
      }
    } catch (err) {
      logger.error(`[ES] Failed to drop index "${indexName}": ${err.message}`)
    }
  }
}

// ── Document Operations ───────────────────────────────────────────────────────

/**
 * Upsert a single document into an ES index.
 *
 * @param {string} index  - One of the INDICES values (e.g. INDICES.hotels)
 * @param {string} id     - The MongoDB _id as a string
 * @param {object} body   - Pre-shaped ES document
 */
const indexDocument = async (index, id, body) => {
  try {
    await esClient.index({ index, id, body, refresh: 'wait_for' })
  } catch (err) {
    logger.error(`[ES] indexDocument failed (${index}/${id}): ${err.message}`)
  }
}

/**
 * Remove a document from an ES index.
 */
const deleteDocument = async (index, id) => {
  try {
    await esClient.delete({ index, id, refresh: 'wait_for' })
  } catch (err) {
    // 404 is fine — document may not have been indexed yet
    if (err?.meta?.statusCode !== 404) {
      logger.error(`[ES] deleteDocument failed (${index}/${id}): ${err.message}`)
    }
  }
}

/**
 * Bulk-index an array of shaped documents.
 *
 * @param {string}   index  - ES index name
 * @param {object[]} docs   - Array of { _id, ...fields } pre-shaped objects
 */
const bulkIndex = async (index, docs) => {
  if (!docs.length) return { indexed: 0, errors: 0 }

  const operations = docs.flatMap((doc) => [
    { index: { _index: index, _id: doc.mongoId } },
    doc,
  ])

  const result = await esClient.bulk({ refresh: true, operations })
  const erroredItems = (result.items || []).filter((i) => i.index?.error)

  if (erroredItems.length) {
    logger.warn(`[ES] bulkIndex "${index}": ${erroredItems.length} errors out of ${docs.length}`)
  }

  return { indexed: docs.length - erroredItems.length, errors: erroredItems.length }
}

// ── Search Operations ─────────────────────────────────────────────────────────

/**
 * Build the core function_score query for relevance ranking.
 *
 *  Ranking formula:
 *    score = BM25_score × log1p(averageRating × 1.5)
 *
 * @param {object} baseQuery - The inner ES query (multi_match, bool, etc.)
 */
const buildFunctionScoreQuery = (baseQuery) => ({
  function_score: {
    query: baseQuery,
    functions: [
      {
        field_value_factor: {
          field:    'averageRating',
          modifier: 'log1p',
          factor:   1.5,
          missing:  1,
        },
      },
    ],
    boost_mode: 'multiply',
    score_mode: 'sum',
  },
})

/**
 * Resolve ES sort parameter from a user-facing sort string.
 */
const resolveSort = (sortParam) => {
  const map = {
    'rating':  [{ averageRating: 'desc' }],
    '-rating': [{ averageRating: 'asc'  }],
    'price':   [{ priceLevel:    'asc'  }],
    '-price':  [{ priceLevel:    'desc' }],
    'newest':  [{ createdAt:     'desc' }],
    '-newest': [{ createdAt:     'asc'  }],
  }
  return map[sortParam] || ['_score']   // default: relevance
}

/**
 * Full-text search with optional fuzzy matching and field filters.
 *
 * @param {object}   opts
 * @param {string}   opts.index   - INDICES value
 * @param {string}   opts.query   - User's search string
 * @param {object}   [opts.filters] - Additional ES filter clauses (term / range)
 * @param {boolean}  [opts.fuzzy]   - Enable fuzziness (default: false)
 * @param {number}   [opts.page]    - 1-indexed page (default: 1)
 * @param {number}   [opts.limit]   - Results per page (default: 10)
 * @param {string}   [opts.sort]    - Sort key (rating | -rating | price | -price | newest)
 */
const fullTextSearch = async ({
  index,
  query,
  filters = {},
  fuzzy   = false,
  page    = 1,
  limit   = 10,
  sort    = 'relevance',
}) => {
  const from = (page - 1) * limit

  const multiMatchQuery = query
    ? {
        multi_match: {
          query,
          fields:      ['name^3', 'name._2gram^2', 'name._3gram^1.5', 'description^1.5', 'city^2', 'cuisines^1.5', 'category^1.5', 'amenities'],
          type:        'best_fields',
          fuzziness:   fuzzy ? 'AUTO' : 0,
          prefix_length: fuzzy ? 1 : 0,
          operator:    'or',
        },
      }
    : { match_all: {} }

  // Build filter array from the filters map
  const filterClauses = Object.entries(filters).map(([key, value]) => {
    if (typeof value === 'object' && (value.gte !== undefined || value.lte !== undefined)) {
      return { range: { [key]: value } }
    }
    if (Array.isArray(value)) {
      return { terms: { [key]: value } }
    }
    return { term: { [key]: value } }
  })

  const boolQuery = filterClauses.length
    ? { bool: { must: multiMatchQuery, filter: filterClauses } }
    : multiMatchQuery

  const esQuery = query
    ? buildFunctionScoreQuery(boolQuery)
    : boolQuery

  const response = await esClient.search({
    index,
    body: {
      from,
      size: limit,
      query: esQuery,
      sort: resolveSort(sort),
      track_total_hits: true,
    },
  })

  const hits   = response.hits.hits
  const total  = typeof response.hits.total === 'object'
    ? response.hits.total.value
    : response.hits.total

  return {
    data:  hits.map((h) => ({ id: h._id, score: h._score, ...h._source })),
    total,
    page,
    pages: Math.ceil(total / limit),
  }
}

/**
 * Autocomplete — fast prefix suggestions using search_as_you_type fields.
 * Best for live-typing dropdowns.
 *
 * @param {object} opts
 * @param {string} opts.index   - INDICES value
 * @param {string} opts.prefix  - Partial input string
 * @param {number} [opts.size]  - Max suggestions (default: 8)
 */
const autocomplete = async ({ index, prefix, size = 8 }) => {
  if (!prefix || prefix.trim().length === 0) return []

  const response = await esClient.search({
    index,
    body: {
      size,
      query: {
        multi_match: {
          query:  prefix,
          type:   'bool_prefix',
          fields: ['name', 'name._2gram', 'name._3gram'],
        },
      },
      _source: ['mongoId', 'name', 'city', 'averageRating'],
    },
  })

  return response.hits.hits.map((h) => ({ id: h._id, ...h._source }))
}

/**
 * Completion suggester — returns ranked suggestions from the `suggest` field.
 * Best for "Did you mean...?" style suggestions.
 *
 * @param {object} opts
 * @param {string} opts.index   - INDICES value
 * @param {string} opts.text    - Input text
 * @param {number} [opts.size]  - Max suggestions (default: 5)
 */
const suggest = async ({ index, text, size = 5 }) => {
  if (!text || text.trim().length === 0) return []

  const response = await esClient.search({
    index,
    body: {
      suggest: {
        nameSuggester: {
          prefix: text,
          completion: {
            field:           'suggest',
            size,
            skip_duplicates: true,
            fuzzy: { fuzziness: 'AUTO' },
          },
        },
      },
    },
  })

  const options = response.suggest?.nameSuggester?.[0]?.options || []
  return options.map((o) => ({ id: o._id, text: o.text, score: o._score, ...o._source }))
}

/**
 * Multi-index search — search hotels, restaurants, and attractions in one shot.
 *
 * @param {object}  opts
 * @param {string}  opts.query  - User's search string
 * @param {number}  [opts.size] - Results per index (default: 5)
 * @param {boolean} [opts.fuzzy]
 */
const multiSearch = async ({ query, size = 5, fuzzy = false }) => {
  const multiMatchQuery = (index) => ({
    multi_match: {
      query,
      fields:    ['name^3', 'description^1.5', 'city^2', 'cuisines^1.5', 'category^1.5'],
      type:      'best_fields',
      fuzziness: fuzzy ? 'AUTO' : 0,
    },
  })

  const searches = [INDICES.hotels, INDICES.restaurants, INDICES.attractions].flatMap((idx) => [
    { index: idx },
    { size, query: buildFunctionScoreQuery(multiMatchQuery(idx)) },
  ])

  const response = await esClient.msearch({ searches })

  const [hotelRes, restaurantRes, attractionRes] = response.responses

  const extract = (res) =>
    (res.hits?.hits || []).map((h) => ({ id: h._id, score: h._score, ...h._source }))

  return {
    hotels:      extract(hotelRes),
    restaurants: extract(restaurantRes),
    attractions: extract(attractionRes),
  }
}

module.exports = {
  INDICES,
  SHAPERS,
  createIndices,
  dropIndices,
  indexDocument,
  deleteDocument,
  bulkIndex,
  fullTextSearch,
  autocomplete,
  suggest,
  multiSearch,
  // expose shapers individually for sync module
  shapeHotel,
  shapeRestaurant,
  shapeAttraction,
  shapeReview,
}
