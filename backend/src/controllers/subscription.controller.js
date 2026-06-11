// server/src/controllers/subscription.controller.js
const Subscription  = require('../models/Subscription.model')
const User          = require('../models/User.model')
const Razorpay      = require('razorpay')
const crypto        = require('crypto')
const { success, badRequest, notFound } = require('../utils/response')
const asyncHandler  = require('../utils/asyncHandler')

const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null

const PLANS = [
  { id: 'free', name: 'Free',   price: 0,     period: 'forever', searchLimit: 5,        features: ['5 AI plans/day', 'Discover feed', 'Group trips (3 max)'] },
  { id: 'pro',  name: 'Pro',    price: 49900, period: 'month',   searchLimit: Infinity,  features: ['Unlimited AI plans', 'Priority Gemini AI', 'Mapbox maps', 'Unlimited groups', 'PDF export', 'Early access'] },
]

exports.getPlans = asyncHandler(async (_, res) => success(res, PLANS))

exports.getStatus = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ userId: req.user._id })
  if (!sub) return success(res, { plan: 'free', isActive: false, usage: { searchesToday: 0, searchLimit: 5 } })

  sub.checkAndResetDaily()
  const limit = sub.getSearchLimit()

  success(res, {
    plan:     sub.plan,
    isActive: sub.isActive,
    startDate: sub.startDate,
    endDate:  sub.endDate,
    usage: {
      searchesToday: sub.searchesToday,
      searchLimit:   limit === Infinity ? 9999 : limit,
    },
  })
})

exports.createOrder = asyncHandler(async (req, res) => {
  const { planId } = req.body
  const plan = PLANS.find(p => p.id === planId && p.price > 0)
  if (!plan) return badRequest(res, 'Invalid plan')
  if (!razorpay) return badRequest(res, 'Payment gateway not configured')

  const order = await razorpay.orders.create({
    amount:   plan.price,  // in paise
    currency: 'INR',
    receipt:  `${req.user._id}-${Date.now()}`,
    notes:    { userId: String(req.user._id), planId },
  })

  success(res, { orderId: order.id, amount: order.amount, currency: order.currency })
})

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body

  const sign = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (sign !== razorpay_signature) return badRequest(res, 'Payment verification failed')

  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)

  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id },
    { plan: 'pro', isActive: true, startDate: new Date(), endDate, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
    { new: true, upsert: true }
  )

  await User.findByIdAndUpdate(req.user._id, { plan: 'pro' })

  success(res, { plan: 'pro', isActive: true, endDate, searchLimit: 9999 }, 'Subscription activated!')
})
