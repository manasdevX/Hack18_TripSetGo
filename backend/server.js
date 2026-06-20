// server/server.js
require('dotenv').config({ quiet: true })

// ── Fail fast on missing critical configuration ────────────────────────────
// Secrets that the app cannot run safely without. Surfacing these at boot beats
// a confusing 500 deep inside a request (e.g. jwt.sign throwing on an undefined secret).
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET']
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`)
  console.error('   Set them in server/.env before starting the server.')
  process.exit(1)
}

const { server } = require('./src/app')
const connectDB  = require('./src/config/db')
const logger     = require('./src/utils/logger')

// Warn (don't crash) when optional integrations are unconfigured — their
// features degrade gracefully (Gemini → deterministic fallback, etc.).
const OPTIONAL_ENV = ['GEMINI_API_KEY', 'GOOGLE_CLIENT_ID', 'SMTP_HOST', 'CLOUDINARY_CLOUD_NAME']
OPTIONAL_ENV.filter((k) => !process.env[k]).forEach((k) =>
  logger.warn(`⚠️  ${k} not set — the related feature will be disabled or use a fallback`)
)

const PORT = process.env.PORT || 5000

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
  logger.error(err.name, err.message)
  process.exit(1)
})

// Connect to MongoDB & Start Server
connectDB().then(async () => {
  // ── Elasticsearch bootstrap (non-fatal) ─────────────────────────────────
  // Register Mongoose ↔ ES sync hooks (must run after DB models are loaded)
  require('./src/services/es.sync')

  const { pingElasticsearch }   = require('./src/config/elasticsearch')
  const { createIndices }       = require('./src/services/elasticsearch.service')

  const esReachable = await pingElasticsearch()
  if (esReachable) {
    await createIndices()
    logger.info('🔍 Elasticsearch indices ready')
  }
  // ───────────────────────────────────────────────────────────────────────

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use. Kill the other process or change PORT in .env`)
    } else {
      logger.error(`❌ Server error: ${err.message}`)
    }
    process.exit(1)
  })

  server.listen(PORT, () => {
    logger.info(`🚀 TripSetGo API ready  ·  http://localhost:${PORT}  ·  ${process.env.NODE_ENV || 'development'}`)
  })

  // ── Recommendation Engine — Trending Cron (30 min) ─────────────────────
  // Run an initial computation shortly after boot (allow Redis to connect first),
  // then repeat every 30 minutes.
  const { computeTrending } = require('./src/services/recommendation.service')
  const TRENDING_INTERVAL_MS = 30 * 60 * 1000  // 30 minutes

  const runTrendingRefresh = () => {
    computeTrending()
      .then(() => logger.info('📈 Trending scores refreshed'))
      .catch(err => logger.error(`[Rec] Trending cron failed: ${err.message}`))
  }

  // Delay first run by 10s to let Redis finish connecting
  setTimeout(() => {
    runTrendingRefresh()
    setInterval(runTrendingRefresh, TRENDING_INTERVAL_MS)
    logger.info(`📈 Trending cron scheduled — runs every ${TRENDING_INTERVAL_MS / 60000} min`)
  }, 10_000)
  // ───────────────────────────────────────────────────────────────────────
})


// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...')
  logger.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})
