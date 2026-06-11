// src/pages/Dashboard/Subscription.jsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Check, Zap, Crown } from 'lucide-react'
import { fetchSubscriptionStatus, fetchPlans, createOrder, verifyPayment, selectSubscription } from '@/features/subscription/subscriptionSlice'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'

const PLANS_FALLBACK = [
  {
    id: 'free', name: 'Free', price: 0, period: 'forever',
    features: ['5 AI trip plans/day', 'Discover feed', 'Basic export', 'Group trips (up to 3)'],
    cta: 'Current Plan',
  },
  {
    id: 'pro', name: 'Pro', price: 499, period: 'month',
    features: ['Unlimited AI trip plans', 'Priority Gemini AI', 'Mapbox route maps', 'PDF/Excel export', 'Unlimited group trips', 'Early access features'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
]

export default function Subscription() {
  const dispatch     = useDispatch()
  const subscription = useSelector(selectSubscription)

  useEffect(() => {
    dispatch(fetchSubscriptionStatus())
    dispatch(fetchPlans())
  }, [dispatch])

  const plans = subscription.plans.length ? subscription.plans : PLANS_FALLBACK

  const handleUpgrade = async (planId) => {
    const res = await dispatch(createOrder(planId))
    if (!res.error && res.payload) {
      const { orderId, amount, currency } = res.payload
      // Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount, currency, order_id: orderId, name: 'TripSetGo Pro',
        description: 'Monthly subscription',
        handler: async (response) => {
          const result = await dispatch(verifyPayment({ ...response, planId }))
          if (!result.error) {
            window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Payment successful! Pro activated.' } }))
          } else {
            window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Payment verification failed. Please contact support.' } }))
          }
        },
        theme: { color: '#6366f1' },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    }
  }

  return (
    <div className="page-enter">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Upgrade Your <span className="gradient-text">Plan</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Unlock unlimited AI trip planning and premium features</p>
        {subscription.plan === 'pro' && (
          <div style={{ marginTop: '1rem' }}>
            <Badge label="✓ Pro Active" variant="green" />
          </div>
        )}
      </div>

      {/* Usage */}
      {subscription.usage && (
        <div className="glass" style={{ maxWidth: 500, margin: '0 auto 3rem', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Today's Usage</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>AI Plans Used</span>
            <span style={{ fontWeight: 700 }}>{subscription.usage.searchesToday} / {subscription.usage.searchLimit}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((subscription.usage.searchesToday / subscription.usage.searchLimit) * 100, 100)}%`, background: 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {/* Plans */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{
              width: 320, borderRadius: 'var(--radius-xl)', padding: '2rem',
              background: plan.highlight ? 'rgba(99,102,241,0.08)' : 'var(--color-bg-card)',
              border: `1px solid ${plan.highlight ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`,
              position: 'relative', overflow: 'hidden',
            }}>
            {plan.highlight && (
              <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--gradient-primary)', padding: '0.25rem 1rem', borderBottomLeftRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 700 }}>
                POPULAR
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              {plan.id === 'pro' ? <Crown size={20} color="#f59e0b" /> : <Zap size={20} color="#6366f1" />}
              <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{plan.name}</h2>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>
                {plan.price === 0 ? 'Free' : `₹${plan.price}`}
              </span>
              {plan.price > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>/{plan.period}</span>}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  <Check size={15} color="var(--color-accent-green)" style={{ flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>
            <Button
              style={{ width: '100%' }}
              variant={plan.highlight ? 'primary' : 'secondary'}
              disabled={subscription.plan === plan.id}
              onClick={() => plan.id !== 'free' && handleUpgrade(plan.id)}
            >
              {subscription.plan === plan.id ? '✓ Current Plan' : plan.cta}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
