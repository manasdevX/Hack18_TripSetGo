// src/pages/Dashboard/index.jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Map, Compass, Briefcase, TrendingUp, Plus, ArrowRight, Clock, Heart } from 'lucide-react'
import { selectUser } from '@/features/auth/authSlice'
import { fetchMyTrips, selectTrips, selectTripsLoading } from '@/features/trips/tripsSlice'
import { selectSubscription } from '@/features/subscription/subscriptionSlice'
import { fetchSubscriptionStatus } from '@/features/subscription/subscriptionSlice'
import { SkeletonCard } from '@/components/common/Loader'
import Badge from '@/components/common/Badge'

const quickActions = [
  { icon: <Map size={22} />,    label: 'Plan a Trip',  to: '/dashboard/planner',  color: '#6366f1' },
  { icon: <Compass size={22} />, label: 'Discover',    to: '/dashboard/discover', color: '#06b6d4' },
  { icon: <Briefcase size={22} />, label: 'My Trips',  to: '/dashboard/trips',    color: '#8b5cf6' },
  { icon: <TrendingUp size={22} />, label: 'Analytics',to: '/dashboard/analytics',color: '#10b981' },
]

export default function Dashboard() {
  const dispatch     = useDispatch()
  const user         = useSelector(selectUser)
  const trips        = useSelector(selectTrips)
  const loading      = useSelector(selectTripsLoading)
  const subscription = useSelector(selectSubscription)

  useEffect(() => {
    dispatch(fetchMyTrips({ page: 1, limit: 4 }))
    dispatch(fetchSubscriptionStatus())
  }, [dispatch])

  const recentTrips = trips.slice(0, 4)

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]} 👋</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Ready to plan your next adventure?</p>
      </div>

      {/* Subscription banner */}
      {subscription.plan === 'free' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ marginBottom: '2rem', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid var(--color-accent-primary)' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '0.125rem' }}>✨ Upgrade to Pro</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Unlimited trip planning, priority AI, and more.</p>
          </div>
          <Link to="/dashboard/subscription" className="btn btn-primary btn-sm">Upgrade <ArrowRight size={14} /></Link>
        </motion.div>
      )}

      {/* Quick actions */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {quickActions.map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Link to={action.to} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card card-hover" style={{ textAlign: 'center', padding: '1.75rem 1rem', cursor: 'pointer' }}>
                  <div style={{ width: 52, height: 52, background: `${action.color}20`, border: `1px solid ${action.color}40`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color, margin: '0 auto 1rem' }}>
                    {action.icon}
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{action.label}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent trips */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Recent Trips</h2>
          <Link to="/dashboard/trips" style={{ color: 'var(--color-accent-primary)', fontSize: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : recentTrips.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>✈️</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No trips yet</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Plan your first AI-powered trip in seconds!</p>
            <Link to="/dashboard/planner" className="btn btn-primary">
              <Plus size={16} /> Plan Your First Trip
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {recentTrips.map((trip, i) => (
              <motion.div key={trip._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <div className="card card-hover">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{trip.destination}</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>from {trip.source}</p>
                    </div>
                    <Badge label={trip.plan === 'pro' ? 'Pro' : 'Free'} variant={trip.plan === 'pro' ? 'cyan' : 'primary'} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {trip.planData?.meta?.total_days || '?'} days</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Heart size={13} /> {trip.likesCount || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
