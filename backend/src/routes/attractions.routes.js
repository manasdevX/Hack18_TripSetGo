// backend/src/routes/attractions.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Attractions Discovery API routes.
//
// Base path: /api/v1/attractions  (mounted in routes/index.js)
//
// Endpoints:
//   GET /health            → provider health check (no cache, no auth)
//   GET /city              → search attractions by city name (cached 15 min)
//   GET /nearby            → search nearby attractions by lat/lon (cached 10 min)
//   GET /:xid              → get full attraction details (cached 30 min)
//
// Cache headers set automatically:
//   X-Cache: HIT | MISS
//   X-Cache-Namespace: attractions:city | attractions:nearby | attractions:detail
//
// All public endpoints — no authentication required (optionalAuth for future personalisation).
// ─────────────────────────────────────────────────────────────────────────────
const router          = require('express').Router()
const attractionsCtrl = require('../controllers/attractions.controller')
const cache           = require('../middleware/cache.middleware')
const validate        = require('../middleware/validate.middleware')
const { optionalAuth } = require('../middleware/auth.middleware')

const {
  cityQuerySchema,
  nearbyQuerySchema,
  xidParamSchema,
} = require('../validators/attractions.validator')

// ── Health check (no caching) ─────────────────────────────────────────────────
router.get(
  '/health',
  attractionsCtrl.getHealth
)

// ── Search by city (15 min cache) ─────────────────────────────────────────────
//
// GET /api/v1/attractions/city?city=Jaipur&limit=20&radius=12000&kinds=museums,historic
router.get(
  '/city',
  optionalAuth,
  validate({ query: cityQuerySchema }),
  cache('attractions:city', 900),
  attractionsCtrl.searchByCity
)

// ── Search nearby (10 min cache) ──────────────────────────────────────────────
//
// GET /api/v1/attractions/nearby?lat=26.9&lon=75.8&radius=5000&limit=20
router.get(
  '/nearby',
  optionalAuth,
  validate({ query: nearbyQuerySchema }),
  cache('attractions:nearby', 600),
  attractionsCtrl.searchNearby
)

// ── Get attraction detail by xid (30 min cache) ───────────────────────────────
//
// GET /api/v1/attractions/Q133182
// GET /api/v1/attractions/Q133182?refresh=true  ← bypass cache
router.get(
  '/:xid',
  optionalAuth,
  validate({ params: xidParamSchema }),
  cache('attractions:detail', 1800),
  attractionsCtrl.getDetail
)

module.exports = router
