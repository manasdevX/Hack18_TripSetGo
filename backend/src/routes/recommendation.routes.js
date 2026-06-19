// server/src/routes/recommendation.routes.js
// All routes under /api/v1/recommendations/
const router  = require('express').Router()
const rateLimit = require('express-rate-limit')
const recCtrl = require('../controllers/recommendation.controller')
const { authenticate, optionalAuth, authorize } = require('../middleware/auth.middleware')
const cache   = require('../middleware/cache.middleware')

// Rate limiting for view events to prevent artificial boosting
const viewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 500 views per hour per user
  message: { success: false, message: 'Too many view events. Please try again later.' }
})

// ── Public / optional auth ────────────────────────────────────────────────────

// GET /recommendations/similar/:targetType/:targetId
// Auth: optional — deprioritises viewed items for logged-in users
// Cache: 30 min (entity-specific, rarely changes)
router.get('/similar/:targetType/:targetId', optionalAuth, recCtrl.getSimilar)

// GET /recommendations/trending
// Auth: none
// Cache: 10 min (refreshed every 30 min by cron)
router.get('/trending', cache('rec:trending'), recCtrl.getTrending)

// ── Authenticated ─────────────────────────────────────────────────────────────

// GET /recommendations/for-you
// Auth: required
// Cache: 5 min (user-specific, invalidated on view events)
router.get('/for-you', authenticate, recCtrl.getPersonalized)

// GET /recommendations/recently-viewed
// Auth: required
// No cache — served directly from Redis sorted set (already in-memory)
router.get('/recently-viewed', authenticate, recCtrl.getRecentlyViewed)

// POST /recommendations/view
// Record a view event — writes to Redis + MongoDB UserActivity
// Auth: required
router.post('/view', authenticate, viewLimiter, recCtrl.recordView)

// ── Admin only ────────────────────────────────────────────────────────────────

// POST /recommendations/trending/refresh
// Force-recompute trending scores (admin panel use)
router.post('/trending/refresh', authenticate, authorize('admin'), recCtrl.refreshTrending)

module.exports = router
