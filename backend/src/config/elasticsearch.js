// server/src/config/elasticsearch.js
// ─────────────────────────────────────────────────────────────────────────────
// Singleton Elasticsearch client.
// Reads connection details from environment variables so credentials never
// end up hardcoded in source.
//
// Elasticsearch is an OPTIONAL dependency: if the `@elastic/elasticsearch`
// package isn't installed (or the cluster is unreachable), the API must still
// boot — ES-powered search simply falls back to MongoDB text search. We
// therefore require the package lazily inside a try/catch (mirroring redis.js)
// and expose a stub client that rejects on use rather than crashing at load.
// ─────────────────────────────────────────────────────────────────────────────
const logger = require('../utils/logger')

const ELASTICSEARCH_URL      = process.env.ELASTICSEARCH_URL      || 'http://localhost:9200'
const ELASTICSEARCH_USERNAME = process.env.ELASTICSEARCH_USERNAME || ''
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || ''

let Client = null
try {
  ;({ Client } = require('@elastic/elasticsearch'))
} catch {
  logger.warn('⚠️  @elastic/elasticsearch not installed — search falls back to MongoDB text search.')
}

let esAvailable = false
let esClient

if (Client) {
  const clientOptions = { node: ELASTICSEARCH_URL }

  // Only add auth when credentials are provided (avoids sending empty Basic header)
  if (ELASTICSEARCH_USERNAME && ELASTICSEARCH_PASSWORD) {
    clientOptions.auth = {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
    }
  }

  esClient = new Client(clientOptions)
  esAvailable = true
} else {
  // Stub: any property access / call rejects, so callers fall back to Mongo.
  // A Proxy handles both flat (esClient.search) and nested (esClient.indices.create) calls.
  const reject = () => Promise.reject(new Error('Elasticsearch is not available'))
  const handler = {
    get: () => new Proxy(reject, handler),
    apply: () => reject(),
  }
  esClient = new Proxy(reject, handler)
}

/**
 * Ping Elasticsearch and log the result.
 * Called once at startup — failure is non-fatal (ES is optional at boot time
 * so that a missing package / index seed doesn't kill the whole API server).
 */
const pingElasticsearch = async () => {
  if (!esAvailable) {
    logger.warn('🔎 Elasticsearch disabled — using MongoDB search')
    return false
  }
  try {
    const info = await esClient.info()
    logger.info(`✅ Elasticsearch connected (v${info.version.number})`)
    return true
  } catch {
    logger.warn('🔎 Elasticsearch offline — using MongoDB search')
    return false
  }
}

module.exports = { esClient, pingElasticsearch, esAvailable }
