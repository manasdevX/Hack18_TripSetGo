// server/src/controllers/subscription.controller.js
const Joi          = require('joi')
const Subscription = require('../models/Subscription.model')
const Payment      = require('../models/Payment.model')
const User         = require('../models/User.model')
const { PLANS, getPlanById, createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } = require('../services/payment.service')
const { success, badRequest } = require('../utils/response')
const asyncHandler  = require('../utils/asyncHandler')
const { withTransaction } = require('../utils/transaction')
const { cacheDel: cacheDelete } = require('../config/redis')
const logger        = require('../utils/logger')

// ── Input validation schemas ──────────────────────────────────────────────────

const createOrderSchema = Joi.object({
  planId: Joi.string().valid('pro').required().messages({
    'any.only':    'planId must be "pro"',
    'any.required': 'planId is required',
  }),
})

const verifyPaymentSchema = Joi.object({
  razorpay_order_id:   Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature:  Joi.string().required(),
  planId:              Joi.string().valid('pro').required(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Invalidate all subscription-related Redis cache keys for a user.
 * Best-effort: logs on failure but never throws.
 */
async function invalidateSubscriptionCache (userId) {
  try {
    await cacheDelete(`subscription:status:${userId}`)
    await cacheDelete(`user:plan:${userId}`)
    logger.info(`[Payment] Cache invalidated for user ${userId}`)
  } catch (err) {
    logger.warn(`[Payment] Cache invalidation failed for user ${userId}: ${err.message}`)
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/subscriptions/plans
 * Public — no auth required.
 * Returns the list of available plans (prices in paise).
 */
exports.getPlans = asyncHandler(async (_, res) =>
  success(res, PLANS)
)

/**
 * GET /api/v1/subscriptions/status
 * Protected — requires auth.
 * Returns the calling user's current subscription status and daily usage.
 */
exports.getStatus = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ userId: req.user._id })

  if (!sub) {
    return success(res, {
      plan:     'free',
      isActive: false,
      usage:    { searchesToday: 0, searchLimit: 5 },
    })
  }

  sub.checkAndResetDaily()
  await sub.save()   // persist the reset if it happened

  const limit = sub.getSearchLimit()

  return success(res, {
    plan:      sub.plan,
    isActive:  sub.isActive,
    startDate: sub.startDate,
    endDate:   sub.endDate,
    usage: {
      searchesToday: sub.searchesToday,
      searchLimit:   limit === Infinity ? 9999 : limit,
    },
  })
})

/**
 * POST /api/v1/subscriptions/create-order
 * Protected — requires auth.
 * Creates a Razorpay order and returns { orderId, amount, currency }.
 */
exports.createOrder = asyncHandler(async (req, res) => {
  // ── Validate input ─────────────────────────────────────────────────────────
  const { error: validationError, value } = createOrderSchema.validate(req.body)
  if (validationError) return badRequest(res, validationError.details[0].message)

  const { planId } = value
  const plan = getPlanById(planId)
  if (!plan || !plan.price) return badRequest(res, 'Invalid or free plan — nothing to order')

  // ── Check if already subscribed and active ─────────────────────────────────
  const existingSub = await Subscription.findOne({ userId: req.user._id })
  if (existingSub?.plan === 'pro' && existingSub?.isActive) {
    const now     = new Date()
    const endDate = existingSub.endDate ? new Date(existingSub.endDate) : null
    if (endDate && endDate > now) {
      return badRequest(res, `You already have an active Pro subscription until ${endDate.toLocaleDateString()}`)
    }
  }

  // ── Create pending Payment record ──────────────────────────────────────────
  // The Razorpay order is created first; the payment record is inserted after.
  const order = await createRazorpayOrder({ userId: req.user._id, planId })

  await Payment.create({
    userId:          req.user._id,
    razorpayOrderId: order.id,
    planId,
    amount:          order.amount,
    currency:        order.currency,
    status:          'pending',
  })

  logger.info(`[Payment] Pending payment record created for order ${order.id}`)

  return success(res, {
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    keyId:    process.env.RAZORPAY_KEY_ID,  // Safe to return — it's the public key
  })
})

/**
 * POST /api/v1/subscriptions/verify-payment
 * Protected — requires auth.
 * Verifies Razorpay signature, activates subscription, records payment.
 *
 * IDEMPOTENCY: A unique index on Payment.razorpayPaymentId ensures that the
 * same paymentId can never be processed twice — even with concurrent requests.
 */
exports.verifyPayment = asyncHandler(async (req, res) => {
  // ── Validate input ─────────────────────────────────────────────────────────
  const { error: validationError, value } = verifyPaymentSchema.validate(req.body)
  if (validationError) return badRequest(res, validationError.details[0].message)

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId,
  } = value

  // ── Idempotency check ──────────────────────────────────────────────────────
  // If this paymentId has already been captured, return the current sub state
  // without re-processing.
  const existingPayment = await Payment.findOne({ razorpayPaymentId: razorpay_payment_id })
  if (existingPayment && existingPayment.status === 'captured') {
    logger.warn(`[Payment] Duplicate verify-payment for ${razorpay_payment_id} — already captured`)
    const sub = await Subscription.findOne({ userId: req.user._id })
    return success(res, {
      plan:        sub?.plan || 'pro',
      isActive:    sub?.isActive || true,
      endDate:     sub?.endDate,
      searchLimit: 9999,
    }, 'Subscription is already active')
  }

  // ── Signature verification ─────────────────────────────────────────────────
  const isValid = verifyPaymentSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  })

  if (!isValid) {
    logger.warn(`[Payment] SIGNATURE MISMATCH for order ${razorpay_order_id}, payment ${razorpay_payment_id}`)
    // Mark the payment attempt as failed
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'failed', failureReason: 'Signature mismatch' }
    )
    return badRequest(res, 'Payment verification failed — invalid signature')
  }

  // ── Atomically update subscription + user plan ─────────────────────────────
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)

  let sub
  try {
    sub = await withTransaction(async (session) => {
      // 1. Upsert Subscription document
      const updatedSub = await Subscription.findOneAndUpdate(
        { userId: req.user._id },
        {
          plan:              'pro',
          isActive:          true,
          startDate:         new Date(),
          endDate,
          razorpayOrderId:   razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          // We intentionally do NOT store the raw signature in the sub document
          // The Payment record serves as the source of truth
        },
        { returnDocument: 'after', upsert: true, session }
      )

      // 2. Update user plan field
      await User.findByIdAndUpdate(
        req.user._id,
        { plan: 'pro' },
        { session }
      )

      // 3. Update the Payment record to captured
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          status:            'captured',
          capturedAt:        new Date(),
        },
        { session, upsert: false }
      )

      return updatedSub
    })
  } catch (txErr) {
    // Check for duplicate key (concurrent replay)
    if (txErr.code === 11000) {
      logger.warn(`[Payment] Race condition — duplicate payment ${razorpay_payment_id}`)
      const currentSub = await Subscription.findOne({ userId: req.user._id })
      return success(res, {
        plan:        currentSub?.plan || 'pro',
        isActive:    true,
        endDate:     currentSub?.endDate || endDate,
        searchLimit: 9999,
      }, 'Subscription already active')
    }
    logger.error(`[Payment] Transaction failed for payment ${razorpay_payment_id}: ${txErr.message}`)
    throw txErr   // Re-throw — asyncHandler will forward to Express error handler
  }

  // ── Invalidate Redis caches ────────────────────────────────────────────────
  await invalidateSubscriptionCache(req.user._id)

  logger.info(`[Payment] ✅ Pro subscription activated for user ${req.user._id}, payment ${razorpay_payment_id}`)

  return success(res, {
    plan:        'pro',
    isActive:    true,
    startDate:   sub.startDate,
    endDate,
    searchLimit: 9999,
  }, 'Subscription activated! Welcome to Pro 🎉')
})

/**
 * GET /api/v1/subscriptions/history
 * Protected — requires auth.
 * Returns the user's payment history, newest first.
 */
exports.getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  return success(res, payments)
})

/**
 * POST /api/v1/subscriptions/webhook
 * Public — no auth (Razorpay calls this from their servers).
 * Raw body parsing must be applied BEFORE this handler (see subscription.routes.js).
 *
 * Handles:
 *   payment.captured — activates subscription if not yet activated (browser-close case)
 *   payment.failed   — marks the payment record as failed
 */
exports.handleWebhook = asyncHandler(async (req, res) => {
  // ── Signature verification ─────────────────────────────────────────────────
  const signature     = req.headers['x-razorpay-signature']
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  const rawBody       = req.rawBody  // Populated by raw body middleware in routes

  if (!signature) {
    logger.warn('[Webhook] Missing X-Razorpay-Signature header')
    return res.status(400).json({ success: false, message: 'Missing webhook signature' })
  }

  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
  if (!isValid) {
    logger.warn('[Webhook] INVALID signature — rejecting webhook')
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
  }

  const event   = req.body
  const eventId = event?.event

  logger.info(`[Webhook] Received event: ${eventId}`)

  // ── payment.captured ───────────────────────────────────────────────────────
  if (eventId === 'payment.captured') {
    const payment    = event.payload?.payment?.entity
    const orderId    = payment?.order_id
    const paymentId  = payment?.id
    const notes      = payment?.notes || {}
    const userId     = notes.userId
    const planId     = notes.planId || 'pro'

    if (!userId || !orderId || !paymentId) {
      logger.warn('[Webhook] payment.captured missing required fields')
      return res.status(200).json({ success: true })  // Always 200 to Razorpay
    }

    // Idempotency: If already captured, skip silently
    const existing = await Payment.findOne({ razorpayPaymentId: paymentId })
    if (existing?.status === 'captured') {
      logger.info(`[Webhook] payment.captured already processed: ${paymentId}`)
      return res.status(200).json({ success: true })
    }

    // Activate subscription (same logic as verifyPayment but via webhook)
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    try {
      await withTransaction(async (session) => {
        await Subscription.findOneAndUpdate(
          { userId },
          { plan: 'pro', isActive: true, startDate: new Date(), endDate, razorpayOrderId: orderId, razorpayPaymentId: paymentId },
          { returnDocument: 'after', upsert: true, session }
        )
        await User.findByIdAndUpdate(userId, { plan: 'pro' }, { session })
        await Payment.findOneAndUpdate(
          { razorpayOrderId: orderId },
          { razorpayPaymentId: paymentId, status: 'captured', capturedAt: new Date(), webhookReceived: true, webhookEvent: eventId },
          { session, upsert: true }
        )
      })

      await invalidateSubscriptionCache(userId)
      logger.info(`[Webhook] ✅ Subscription activated via webhook for user ${userId}`)
    } catch (err) {
      if (err.code === 11000) {
        logger.info(`[Webhook] Concurrent capture race for ${paymentId} — ignoring`)
      } else {
        logger.error(`[Webhook] Transaction failed: ${err.message}`)
        // Return 500 so Razorpay retries the webhook
        return res.status(500).json({ success: false })
      }
    }
  }

  // ── payment.failed ─────────────────────────────────────────────────────────
  if (eventId === 'payment.failed') {
    const payment   = event.payload?.payment?.entity
    const orderId   = payment?.order_id
    const paymentId = payment?.id
    const reason    = payment?.error_description || 'Unknown failure'

    if (orderId) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        {
          status:          'failed',
          failureReason:   reason,
          webhookReceived: true,
          webhookEvent:    eventId,
          ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        }
      )
      logger.info(`[Webhook] payment.failed recorded for order ${orderId}: ${reason}`)
    }
  }

  // Always respond 200 to acknowledge receipt
  return res.status(200).json({ success: true, received: true })
})
