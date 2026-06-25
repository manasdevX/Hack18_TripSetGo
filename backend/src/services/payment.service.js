// server/src/services/payment.service.js
// Single source of truth for all Razorpay interactions.
// Controllers call these helpers rather than touching the SDK directly.
const crypto  = require('crypto')
const logger  = require('../utils/logger')

// ── Plan Definitions ──────────────────────────────────────────────────────────
// Defined once here and exported so both the controller and any other
// service always references the same data.
const PLANS = [
  {
    id:          'free',
    name:        'Free',
    price:       0,        // paise
    period:      'forever',
    searchLimit: 5,
    features:    ['5 AI trip plans/day', 'Discover feed', 'Basic export', 'Group trips (up to 3)'],
  },
  {
    id:          'pro',
    name:        'Pro',
    price:       4900,    // paise  = ₹49/month
    period:      'month',
    searchLimit: Infinity,
    features:    [
      'Unlimited AI trip plans',
      'Priority Gemini AI',
      'Mapbox route maps',
      'PDF/Excel export',
      'Unlimited group trips',
      'Early access features',
    ],
  },
]

// ── Lazy-initialise Razorpay SDK ──────────────────────────────────────────────
let _razorpay = null

function getRazorpayClient () {
  if (_razorpay) return _razorpay
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn('⚠️  Razorpay credentials not configured — payment features disabled')
    return null
  }
  const Razorpay = require('razorpay')
  _razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
  return _razorpay
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return a plan definition by id.
 * @param {string} planId
 * @returns {object|undefined}
 */
function getPlanById (planId) {
  return PLANS.find(p => p.id === planId)
}

/**
 * Create a Razorpay order for the given plan.
 * @param {{ userId: string, planId: string }} options
 * @returns {Promise<RazorpayOrder>}
 */
async function createRazorpayOrder ({ userId, planId }) {
  const rzp  = getRazorpayClient()
  const plan = getPlanById(planId)

  if (!rzp)   throw new Error('Payment gateway not configured')
  if (!plan)  throw new Error(`Unknown plan: ${planId}`)
  if (!plan.price) throw new Error('Cannot create an order for a free plan')

  const order = await rzp.orders.create({
    amount:   plan.price,
    currency: 'INR',
    receipt:  `${userId}-${Date.now()}`,
    notes:    { userId: String(userId), planId },
  })

  logger.info(`[Payment] Order created: ${order.id} for user ${userId}, plan ${planId}`)
  return order
}

/**
 * Verify that a Razorpay payment signature is authentic.
 * Returns true on success, throws on tampered/invalid signature.
 * @param {{ razorpay_order_id, razorpay_payment_id, razorpay_signature }} params
 * @returns {boolean}
 */
function verifyPaymentSignature ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  const a = Buffer.from(expectedSign,       'hex')
  const b = Buffer.from(razorpay_signature, 'hex')

  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Verify a Razorpay webhook signature.
 * Razorpay signs the raw body with the webhook secret.
 * @param {string} rawBody      — raw request body as string (NOT parsed JSON)
 * @param {string} signature    — value of X-Razorpay-Signature header
 * @param {string} webhookSecret
 * @returns {boolean}
 */
function verifyWebhookSignature (rawBody, signature, webhookSecret) {
  if (!webhookSecret) {
    logger.warn('[Payment] RAZORPAY_WEBHOOK_SECRET not configured — skipping webhook signature check')
    return true   // Degrade gracefully in dev (no secret set), but log the warning
  }

  const expectedSign = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  const a = Buffer.from(expectedSign, 'hex')
  const b = Buffer.from(signature,    'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

module.exports = {
  PLANS,
  getPlanById,
  getRazorpayClient,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
}
