// server/src/routes/subscription.routes.js
const express = require('express')
const router  = express.Router()
const subCtrl = require('../controllers/subscription.controller')
const { authenticate } = require('../middleware/auth.middleware')

// ── Raw-body middleware for Razorpay webhook ──────────────────────────────────
// Razorpay's signature verification requires the *raw* (un-parsed) request body.
// We capture it here before express.json() transforms it.
const rawBodyCapture = (req, res, next) => {
  let data = ''
  req.setEncoding('utf8')
  req.on('data', chunk => { data += chunk })
  req.on('end', () => {
    req.rawBody = data
    next()
  })
}

// ── Public routes (no auth required) ─────────────────────────────────────────
// Guests and logged-in users alike should be able to view pricing.
router.get('/plans', subCtrl.getPlans)

// Razorpay sends webhook events from their servers — Bearer auth is not possible.
// The handler verifies authenticity using HMAC signature instead.
router.post('/webhook', rawBodyCapture, subCtrl.handleWebhook)

// ── Protected routes (auth required) ─────────────────────────────────────────
router.use(authenticate)

router.get('/status',          subCtrl.getStatus)
router.get('/history',         subCtrl.getPaymentHistory)
router.post('/create-order',   subCtrl.createOrder)
router.post('/verify-payment', subCtrl.verifyPayment)

module.exports = router
