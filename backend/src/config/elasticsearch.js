// server/src/config/elasticsearch.js
// ─────────────────────────────────────────────────────────────────────────────
// Singleton Elasticsearch client.
// Reads connection details from environment variables so credentials never
// end up hardcoded in source.
// ─────────────────────────────────────────────────────────────────────────────
const { Client } = require('@elastic/elasticsearch')
const logger     = require('../utils/logger')

const ELASTICSEARCH_URL      = process.env.ELASTICSEARCH_URL      || 'http://localhost:9200'
const ELASTICSEARCH_USERNAME = process.env.ELASTICSEARCH_USERNAME || ''
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || ''

const clientOptions = { node: ELASTICSEARCH_URL }

// Only add auth when credentials are provided (avoids sending empty Basic header)
if (ELASTICSEARCH_USERNAME && ELASTICSEARCH_PASSWORD) {
  clientOptions.auth = {
    username: ELASTICSEARCH_USERNAME,
    password: ELASTICSEARCH_PASSWORD,
  }
}

const esClient = new Client(clientOptions)

/**
 * Ping Elasticsearch and log the result.
 * Called once at startup — failure is non-fatal (ES is optional at boot time
 * so that missing the index seed doesn't kill the whole API server).
 */
const pingElasticsearch = async () => {
  try {
    const info = await esClient.info()
    logger.info(`✅ Elasticsearch connected — cluster: ${info.cluster_name}, version: ${info.version.number}`)
    return true
  } catch (err) {
    logger.warn(`⚠️  Elasticsearch not reachable at ${ELASTICSEARCH_URL}: ${err.message}`)
    logger.warn('   ES-powered search endpoints will return 503 until the cluster is available.')
    return false
  }
}

module.exports = { esClient, pingElasticsearch }
