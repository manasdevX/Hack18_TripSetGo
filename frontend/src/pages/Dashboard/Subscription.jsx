// src/pages/Dashboard/Subscription.jsx
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Zap, Crown, HelpCircle, ChevronDown, ChevronUp,
  CreditCard, Shield, Clock, History, Loader2,
  CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import {
  fetchSubscriptionStatus,
  fetchPlans,
  fetchPaymentHistory,
  createOrder,
  verifyPayment,
  selectSubscription,
  selectSubLoading,
  selectSubVerifying,
  clearError,
} from '@/features/subscription/subscriptionSlice'
import Badge from '@/components/common/Badge'

// ── Static fallback plans (shown while API loads) ─────────────────────────────
const PLANS_FALLBACK = [
  {
    id: 'free', name: 'Free', price: 0, period: 'forever',
    features: ['5 AI trip plans/day', 'Discover feed', 'Basic export', 'Group trips (up to 3)'],
  },
  {
    id: 'pro', name: 'Pro', price: 4900, period: 'month',  // price in paise = ₹49/month
    features: [
      'Unlimited AI trip plans',
      'Priority Gemini AI',
      'Mapbox route maps',
      'PDF/Excel export',
      'Unlimited group trips',
      'Early access features',
    ],
    highlight: true,
  },
]

const FAQS = [
  {
    q: 'How many trips can I plan with the Free plan?',
    a: 'The Free plan allows you to plan up to 5 AI-powered itineraries per day, which resets daily. You can also explore public community trips and collaborate with up to 3 group members.',
  },
  {
    q: 'Can I cancel my subscription at any time?',
    a: 'Yes, absolutely! There are no long-term contracts. You can cancel your subscription at any time directly from this portal, and you will maintain access to Pro features until the end of your billing cycle.',
  },
  {
    q: 'What premium features are included in Pro?',
    a: 'Pro tier unlocks unlimited AI trip planning, priority Gemini AI processing, interactive Mapbox route overlays, high-fidelity PDF/Excel data exports, unlimited group collaborators, and early access to all new dashboard updates.',
  },
  {
    q: 'Are payments secure?',
    a: 'Yes. All payments are processed by Razorpay — a PCI-DSS Level 1 certified payment gateway. We never store your card information on our servers.',
  },
  {
    q: 'What if my browser closed during payment?',
    a: 'No worries! Our system automatically receives a webhook from Razorpay confirming your payment. Your subscription will be activated within minutes even if your browser closed during checkout.',
  },
]

// ── Payment processing overlay ────────────────────────────────────────────────
function PaymentOverlay ({ stage }) {
  const stages = {
    creating:  { icon: <Loader2 size={40} className="animate-spin" color="var(--color-primary)" />, text: 'Creating secure order…' },
    checkout:  { icon: <CreditCard size={40} color="var(--color-primary)" />,                       text: 'Opening payment window…' },
    verifying: { icon: <Shield size={40} color="var(--color-secondary)" />,                         text: 'Verifying payment…' },
    success:   { icon: <CheckCircle2 size={40} color="#22c55e" />,                                  text: 'Payment successful! 🎉' },
    error:     { icon: <AlertCircle size={40} color="var(--color-accent-red)" />,                    text: 'Payment failed' },
  }

  const { icon, text } = stages[stage] || stages.creating

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8, 17, 34, 0.88)', backdropFilter: 'blur(12px)',
        gap: '1rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 250 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
      >
        {icon}
        <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{text}</p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          {stage === 'verifying' ? 'This takes just a moment' : 'Please do not close this window'}
        </p>
      </motion.div>
    </motion.div>
  )
}

// ── Payment history row ───────────────────────────────────────────────────────
function PaymentHistoryRow ({ payment }) {
  const statusColors = {
    captured: '#22c55e',
    failed:   'var(--color-accent-red)',
    pending:  'var(--color-accent-amber)',
    refunded: 'var(--color-text-muted)',
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.875rem 1.25rem',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: statusColors[payment.status] || 'gray',
          boxShadow: `0 0 6px ${statusColors[payment.status] || 'gray'}`,
        }} />
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {payment.planId === 'pro' ? 'Pro Plan — Monthly' : payment.planId}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>
          ₹{((payment.amount || 0) / 100).toFixed(0)}
        </p>
        <p style={{ fontSize: '0.7rem', color: statusColors[payment.status], textTransform: 'capitalize', fontWeight: 600 }}>
          {payment.status}
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Subscription () {
  const dispatch      = useDispatch()
  const subscription  = useSelector(selectSubscription)
  const isOrdering    = useSelector(selectSubLoading)
  const isVerifying   = useSelector(selectSubVerifying)
  const [openFaq, setOpenFaq]             = useState(null)
  const [paymentStage, setPaymentStage]   = useState(null)  // null | 'creating' | 'checkout' | 'verifying' | 'success' | 'error'
  const [showHistory, setShowHistory]     = useState(false)

  useEffect(() => {
    dispatch(fetchSubscriptionStatus())
    dispatch(fetchPlans())
  }, [dispatch])

  const plans = subscription.plans.length ? subscription.plans : PLANS_FALLBACK

  // ── Razorpay guard ─────────────────────────────────────────────────────────
  const isRazorpayLoaded = () => typeof window !== 'undefined' && typeof window.Razorpay === 'function'

  // ── Toast helper ───────────────────────────────────────────────────────────
  const toast = useCallback((type, message) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }))
  }, [])

  // ── Main upgrade flow ──────────────────────────────────────────────────────
  const handleUpgrade = async (planId) => {
    // Guard: Razorpay SDK must be loaded
    if (!isRazorpayLoaded()) {
      toast('error', 'Payment system not available. Please refresh the page and try again.')
      return
    }

    // Guard: prevent double-click if already processing
    if (isOrdering || isVerifying || paymentStage) return

    dispatch(clearError())

    try {
      // Step 1 — Create a Razorpay order via backend
      setPaymentStage('creating')
      const orderAction = await dispatch(createOrder(planId))

      if (orderAction.error || !orderAction.payload) {
        const msg = orderAction.payload || 'Failed to create payment order. Please try again.'
        toast('error', msg)
        setPaymentStage('error')
        setTimeout(() => setPaymentStage(null), 2000)
        return
      }

      const { orderId, amount, currency } = orderAction.payload

      // Step 2 — Open Razorpay checkout modal
      setPaymentStage('checkout')

      await new Promise((resolve, reject) => {
        const options = {
          key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount,
          currency,
          order_id:    orderId,
          name:        'TripSetGo',
          description: 'Pro Monthly Subscription',
          image:       '/favicon.svg',
          prefill: {
            name:  '',
            email: '',
          },
          theme: { color: '#0EA5E9' },

          // ── Payment success handler ──────────────────────────────────────
          handler: async (response) => {
            try {
              // Step 3 — Verify the payment signature on the backend
              setPaymentStage('verifying')
              const verifyAction = await dispatch(verifyPayment({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                planId,
              }))

              if (verifyAction.error || !verifyAction.payload) {
                const msg = verifyAction.payload || 'Payment verification failed. Please contact support if the amount was deducted.'
                toast('error', msg)
                setPaymentStage('error')
                setTimeout(() => setPaymentStage(null), 3000)
                reject(new Error(msg))
                return
              }

              // Step 4 — Success!
              setPaymentStage('success')
              toast('success', '🎉 Welcome to Pro! Your subscription is now active.')
              dispatch(fetchSubscriptionStatus())  // Refresh from server
              setTimeout(() => setPaymentStage(null), 2500)
              resolve()
            } catch (err) {
              setPaymentStage('error')
              toast('error', 'An unexpected error occurred. Please check your payment status.')
              setTimeout(() => setPaymentStage(null), 3000)
              reject(err)
            }
          },

          // ── Modal closed without payment ─────────────────────────────────
          modal: {
            ondismiss: () => {
              setPaymentStage(null)
              toast('info', 'Payment cancelled. You can try again whenever you\'re ready.')
              resolve()  // Resolve (not reject) — user intentionally dismissed
            },
            confirm_close: true,
          },
        }

        const rzp = new window.Razorpay(options)

        // ── Razorpay-level payment failure ────────────────────────────────
        rzp.on('payment.failed', (response) => {
          const reason = response.error?.description || 'Payment was declined'
          toast('error', `Payment failed: ${reason}`)
          setPaymentStage('error')
          setTimeout(() => setPaymentStage(null), 3000)
          resolve()  // Resolve so the outer promise chain doesn't hang
        })

        rzp.open()
      })

    } catch (err) {
      // Catch any unexpected errors
      console.error('[Subscription] Upgrade failed:', err)
      if (paymentStage !== 'success') {
        toast('error', 'An unexpected error occurred. Please try again.')
        setPaymentStage(null)
      }
    }
  }

  const toggleFaq = (index) => setOpenFaq(openFaq === index ? null : index)

  const handleShowHistory = () => {
    if (!showHistory) dispatch(fetchPaymentHistory())
    setShowHistory(h => !h)
  }

  const isPlanBusy = isOrdering || isVerifying || !!paymentStage
  const isPro = subscription.plan === 'pro' && subscription.isActive

  return (
    <>
      {/* Payment Processing Overlay */}
      <AnimatePresence>
        {paymentStage && <PaymentOverlay key="overlay" stage={paymentStage} />}
      </AnimatePresence>

      <div className="animate-fadeIn max-w-[1000px] mx-auto pb-16">

        {/* ── Visual Header ── */}
        <div className="text-center mb-14 relative">
          {/* Glow */}
          <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-[radial-gradient(circle,rgba(14,165,233,0.15)_0%,transparent_70%)] blur-[40px] pointer-events-none z-0" />

          <h1 className="text-4xl font-black mb-3 font-['Plus_Jakarta_Sans',sans-serif] z-10 relative">
            Choose Your Perfect{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">Adventure Plan</span>
          </h1>
          <p className="text-text-secondary text-base max-w-[500px] mx-auto z-10 relative">
            Unlock Gemini-powered itineraries, interactive route maps, and real-time group expense splitting.
          </p>

          {isPro && (
            <div className="mt-5 z-10 relative flex flex-col items-center gap-2">
              <Badge label="✓ Pro Tier Active" variant="green" />
              {subscription.endDate && (
                <p className="text-xs text-text-muted">
                  <Clock size={12} className="inline mr-1" />
                  Renews on {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Usage Tracker ── */}
        {subscription.usage && (
          <div className="bg-bg-glass backdrop-blur-[20px] border border-border max-w-[540px] mx-auto mb-16 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] bg-[rgba(17,24,39,0.7)]">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-extrabold text-[0.95rem] m-0">Today's Usage</p>
                <p className="text-xs text-text-secondary m-0">Daily AI trip plan generations</p>
              </div>
              <span className="font-extrabold text-base text-primary">
                {subscription.usage.searchesToday}
                <span className="text-text-muted font-normal"> / {subscription.usage.searchLimit >= 9999 ? '∞' : subscription.usage.searchLimit}</span>
              </span>
            </div>

            <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden relative border border-[rgba(255,255,255,0.03)]">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-[width] duration-600 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_0_10px_var(--primary)]"
                style={{
                  width: subscription.usage.searchLimit >= 9999
                    ? '100%'
                    : `${Math.min((subscription.usage.searchesToday / subscription.usage.searchLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* ── Pricing Cards ── */}
        <div className="flex gap-8 justify-center flex-wrap mb-16">
          {plans.map((plan, i) => {
            const isPlanPro = plan.id === 'pro'
            const isCurrentPlan = subscription.plan === plan.id && (plan.id === 'free' || subscription.isActive)
            const priceInRupees = plan.price > 0 ? Math.round(plan.price / 100) : 0

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`w-[340px] rounded-3xl py-10 px-8 relative overflow-hidden flex flex-col justify-between transition-all duration-250 ease-out hover:-translate-y-1 hover:border-primary ${
                  isPlanPro
                    ? 'bg-[rgba(17,24,39,0.8)] border border-primary shadow-[0_0_35px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'bg-bg-card border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* SVG watermark */}
                {isPlanPro && (
                  <svg className="absolute top-0 right-0 w-[150px] h-[150px] opacity-15 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
                    <path d="M10,80 Q50,20 90,80" stroke="var(--primary)" strokeWidth="2" strokeDasharray="3 3" fill="none" />
                    <text x="45" y="45" fill="var(--primary)" fontSize="10">✈</text>
                  </svg>
                )}

                {/* RECOMMENDED badge */}
                {isPlanPro && (
                  <div className="absolute top-4 right-4 bg-gradient-to-br from-primary to-accent py-1 px-3 rounded-full text-[0.65rem] font-extrabold text-white tracking-wider flex items-center gap-1 z-10">
                    <span className="w-[5px] h-[5px] rounded-full bg-white inline-block shadow-[0_0_6px_white] animate-pulse" />
                    RECOMMENDED
                  </div>
                )}

                <div className="z-10">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-5">
                    {isPlanPro
                      ? <Crown size={22} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.4))' }} />
                      : <Zap size={22} color="var(--primary)" />
                    }
                    <h2 className="font-extrabold text-[1.35rem] m-0">{plan.name}</h2>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <span className="text-[3rem] font-black tracking-tight text-white">
                      {priceInRupees === 0 ? 'Free' : `₹${priceInRupees}`}
                    </span>
                    {priceInRupees > 0 && (
                      <span className="text-text-secondary text-sm ml-1">/{plan.period}</span>
                    )}
                    {isPlanPro && (
                      <p className="text-primary text-[0.75rem] font-bold mt-1 mb-0">
                        🔥 Limited time offer — best value
                      </p>
                    )}
                  </div>

                  <div className="h-[1px] bg-border my-0 mb-6" />

                  {/* Features */}
                  <ul className="list-none flex flex-col gap-3 mb-10 p-0">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                        <Check size={15} color="var(--secondary)" className="flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  id={`plan-btn-${plan.id}`}
                  type="button"
                  disabled={isCurrentPlan || isPlanBusy}
                  onClick={() => !isCurrentPlan && plan.id !== 'free' && handleUpgrade(plan.id)}
                  aria-label={isCurrentPlan ? 'Current plan' : `Upgrade to ${plan.name}`}
                  className={`w-full py-4 px-7 text-[0.95rem] font-bold rounded-2xl inline-flex items-center justify-center gap-2 transition-all duration-250 ease-out outline-none z-10 ${
                    isCurrentPlan
                      ? 'bg-[rgba(255,255,255,0.05)] text-text-muted cursor-not-allowed opacity-50 border border-solid border-[rgba(255,255,255,0.08)]'
                      : isPlanBusy && isPlanPro
                        ? 'bg-gradient-to-r from-primary via-secondary to-accent text-white border-none cursor-not-allowed opacity-70'
                        : isPlanPro
                          ? 'bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.3)] border-none cursor-pointer opacity-100 hover:-translate-y-[2px] hover:scale-[1.02] hover:brightness-110 active:translate-y-0 active:scale-[0.98]'
                          : 'bg-transparent text-white border border-solid border-border cursor-not-allowed opacity-50'
                  }`}
                >
                  {isCurrentPlan && '✓ Current Plan'}
                  {!isCurrentPlan && plan.id === 'free' && 'Free Plan'}
                  {!isCurrentPlan && isPlanPro && !isPlanBusy && (
                    <>
                      <CreditCard size={16} />
                      Upgrade to Pro
                    </>
                  )}
                  {!isCurrentPlan && isPlanPro && isPlanBusy && (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing…
                    </>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* ── Trust Indicators ── */}
        <div className="flex gap-6 justify-center flex-wrap mb-16">
          {[
            { icon: <Shield size={16} />, text: 'SSL Encrypted Checkout' },
            { icon: <CreditCard size={16} />, text: 'Razorpay Secured — PCI DSS L1' },
            { icon: <RefreshCw size={16} />, text: 'Cancel Anytime' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-text-muted text-xs font-medium">
              {icon} {text}
            </div>
          ))}
        </div>

        {/* ── Payment History ── */}
        {isPro && (
          <div className="bg-bg-glass backdrop-blur-[20px] border border-border rounded-2xl overflow-hidden mb-16">
            <button
              type="button"
              onClick={handleShowHistory}
              className="w-full py-4 px-6 bg-transparent border-none cursor-pointer flex justify-between items-center text-left text-white font-bold text-[0.95rem] outline-none"
            >
              <span className="flex items-center gap-2">
                <History size={18} color="var(--primary)" />
                Payment History
              </span>
              {showHistory ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="border-t border-solid border-[rgba(255,255,255,0.04)]">
                    {subscription.paymentHistory?.length > 0
                      ? subscription.paymentHistory.map(p => <PaymentHistoryRow key={p._id} payment={p} />)
                      : (
                        <div className="py-8 text-center text-text-muted text-sm">
                          No payment records found.
                        </div>
                      )
                    }
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── FAQ Section ── */}
        <div className="border-t border-solid border-border pt-16">
          <div className="text-center mb-12">
            <div className="inline-flex p-2 bg-[rgba(14,165,233,0.1)] rounded-full text-primary mb-3">
              <HelpCircle size={24} />
            </div>
            <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans',sans-serif]">
              Frequently Asked Questions
            </h2>
            <p className="text-text-secondary text-sm">Everything you need to know about TripSetGo pricing and billing</p>
          </div>

          <div className="flex flex-col gap-4 max-w-[680px] mx-auto">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={index}
                  className="bg-bg-glass backdrop-blur-[20px] border border-border rounded-xl overflow-hidden transition-colors duration-150 ease-out"
                >
                  <button
                    type="button"
                    id={`faq-${index}`}
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="w-full py-5 px-6 bg-transparent border-none cursor-pointer flex justify-between items-center text-left text-white font-bold text-[0.95rem] outline-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen
                      ? <ChevronUp size={16} color="var(--primary)" />
                      : <ChevronDown size={16} color="var(--color-text-muted)" />
                    }
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-5 pt-0 text-sm text-text-secondary leading-relaxed border-t border-solid border-[rgba(255,255,255,0.03)]">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
