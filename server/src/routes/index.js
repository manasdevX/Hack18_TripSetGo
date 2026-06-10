// server/src/routes/index.js
const router = require('express').Router()

const authRoutes         = require('./auth.routes')
const tripRoutes         = require('./trip.routes')
const discoverRoutes     = require('./discover.routes')
const userRoutes         = require('./user.routes')
const notificationRoutes = require('./notification.routes')
const subscriptionRoutes = require('./subscription.routes')

router.use('/auth',          authRoutes)
router.use('/trips',         tripRoutes)
router.use('/discover',      discoverRoutes)
router.use('/users',         userRoutes)
router.use('/notifications', notificationRoutes)
router.use('/subscriptions', subscriptionRoutes)

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'TripSetGo API is running', uptime: process.uptime() })
})

module.exports = router
