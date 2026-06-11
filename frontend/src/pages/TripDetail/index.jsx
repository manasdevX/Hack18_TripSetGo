// src/pages/TripDetail/index.jsx — Public read-only trip view (share links land here)
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Users, DollarSign, Heart, Copy, Tag } from 'lucide-react'
import api from '@/services/api'
import Loader from '@/components/common/Loader'
import Navbar from '@/components/layout/Navbar'

function InfoChip({ icon, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.75rem' }}>
      {icon}{label}
    </span>
  )
}

function DayCard({ day }) {
  const slots = [
    { key: 'morning',   label: 'Morning',   color: '#f59e0b' },
    { key: 'afternoon', label: 'Afternoon',  color: '#6366f1' },
    { key: 'evening',   label: 'Evening',    color: '#8b5cf6' },
  ]
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Day {day.day}
        {day.date && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>{new Date(day.date).toLocaleDateString()}</span>}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {slots.map(({ key, label, color }) => {
          const slot = day[key]
          if (!slot?.activities?.length) return null
          return (
            <div key={key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '0.75rem', borderLeft: `3px solid ${color}` }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              {slot.activities.slice(0, 2).map((act, i) => (
                <div key={i} style={{ marginBottom: '0.375rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{act.name}</p>
                  {act.description && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{act.description}</p>}
                  {act.cost > 0 && <p style={{ fontSize: '0.7rem', color: 'var(--color-accent-green)', marginTop: '0.125rem' }}>₹{act.cost.toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TripDetail() {
  const { id }            = useParams()
  const [trip, setTrip]   = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    api.get(`/api/v1/trips/${id}`)
      .then(res => setTrip(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Trip not found or is private'))
      .finally(() => setLoading(false))
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <Loader fullScreen text="Loading trip..." />

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: '8rem auto', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: 56, marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Trip Unavailable</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>{error}</p>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    )
  }

  const plan      = trip.planData || {}
  const meta      = plan.meta || {}
  const days      = meta.total_days || 0
  const breakdown = plan.budget_breakdown_estimate || {}

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Navbar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '7rem 1.5rem 4rem' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/discover" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Discover
          </Link>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
                {trip.source} → <span className="gradient-text">{trip.destination}</span>
              </h1>
              {trip.userId?.name && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Planned by <strong style={{ color: 'var(--color-text-primary)' }}>{trip.userId.name}</strong></p>
              )}
            </div>
            <button onClick={copyLink} className="btn btn-secondary btn-sm" style={{ gap: '0.375rem' }}>
              <Copy size={14} />{copied ? 'Link Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Info chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '2rem' }}>
            {days > 0 && <InfoChip icon={<Calendar size={13} />} label={`${days} days`} />}
            <InfoChip icon={<Users size={13} />} label={`${trip.numTravelers} traveler${trip.numTravelers > 1 ? 's' : ''} · ${trip.groupType}`} />
            <InfoChip icon={<DollarSign size={13} />} label={`₹${Number(trip.budget).toLocaleString()} budget`} />
            {trip.likesCount > 0 && <InfoChip icon={<Heart size={13} />} label={`${trip.likesCount} likes`} />}
          </div>

          {/* Tags */}
          {trip.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
              {trip.tags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', borderRadius: 99, border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Tag size={10} />#{t}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Budget breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Budget Breakdown</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800 }} className="gradient-text">₹{Number(val).toLocaleString()}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{key}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Transport options */}
        {plan.transport_options?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Transport Options</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
              {plan.transport_options.map((t, i) => (
                <div key={i} style={{ padding: '0.875rem', background: t.recommended ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t.recommended ? 'rgba(99,102,241,0.4)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', position: 'relative' }}>
                  {t.recommended && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.2)', borderRadius: 99, padding: '0.1rem 0.4rem' }}>PICK</span>}
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.mode}</p>
                  <p style={{ color: 'var(--color-accent-green)', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.25rem' }}>₹{t.total_cost?.toLocaleString()}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.duration} · {t.comfort} comfort</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Itinerary */}
        {plan.itinerary?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem' }}>
              Day-by-Day <span className="gradient-text">Itinerary</span>
            </h2>
            {plan.itinerary.map(day => <DayCard key={day.day} day={day} />)}
          </motion.div>
        )}

        {/* AI suggestions */}
        {plan.ai_suggestions?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>AI Tips</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {plan.ai_suggestions.map((s, i) => (
                <div key={i} className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{s.title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Want to plan a trip like this?</p>
          <Link to="/auth/signup" className="btn btn-primary btn-lg">Start Planning Free →</Link>
        </div>
      </div>
    </div>
  )
}
