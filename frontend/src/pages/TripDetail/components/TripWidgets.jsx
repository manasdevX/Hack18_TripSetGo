import React from 'react'
import { motion } from 'framer-motion'
import { Users, X, CloudRain, Hotel, MapPin, Navigation } from 'lucide-react'
import Badge from '@/components/common/Badge'

export function CollaboratorsList({ trip, isOwner, handleRemoveCollaborator }) {
  if (!trip.collaborators?.length) return null

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users size={16} /> Collaborators
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {trip.collaborators.map((collab) => (
          <div key={collab._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', padding: '0.375rem 0.75rem', borderRadius: '99px' }}>
            <img src={collab.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${collab.userId?.name}`} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{collab.userId?.name}</span>
            <Badge label={`${collab.status} (${collab.role})`} variant={collab.status === 'accepted' ? 'success' : 'warning'} className="text-[0.55rem] px-1.5 py-0.5 normal-case" />
            {isOwner && (
              <button onClick={() => handleRemoveCollaborator(collab.userId?._id)} style={{ border: 'none', background: 'transparent', color: 'var(--color-accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '0.25rem' }} title="Remove">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BudgetBreakdown({ breakdown }) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Budget Breakdown</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
        {Object.entries(breakdown).map(([key, val]) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800 }} className="bg-gradient-primary bg-clip-text text-transparent">₹{Number(val).toLocaleString()}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{key}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function AITips({ suggestions }) {
  if (!suggestions?.length) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>AI Tips</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {suggestions.map((s, i) => (
          <div key={i} className="bg-bg-glass backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{s.title}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function LiveWeather({ weather }) {
  if (!weather?.available || !weather.forecast?.length) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginTop: '2rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CloudRain size={18} color="#F59E0B" /> Trip Weather Forecast
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
        {weather.forecast.slice(0, 5).map((w, i) => (
          <div key={i} className="bg-bg-card border border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>{new Date(w.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            <div style={{ fontSize: '1.75rem', margin: '0.5rem 0' }}>{w.conditionIcon || '🌤️'}</div>
            <p style={{ fontWeight: 800, fontSize: '1rem' }}>{Math.round(w.tempMaxC)}° <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{Math.round(w.tempMinC)}°</span></p>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-accent-blue)', marginTop: '0.25rem' }}>💧 {Math.round(w.rainProbability)}%</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function LiveHotels({ hotels }) {
  if (!hotels?.length) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ marginTop: '2rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Hotel size={18} color="#0EA5E9" /> Available Stays
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {hotels.slice(0, 4).map((h, i) => (
          <div key={i} className="bg-bg-glass backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 8, background: h.photo ? `url(${h.photo}) center/cover` : 'rgba(14,165,233,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!h.photo && <Hotel size={24} color="#0EA5E9" />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }} className="line-clamp-1" title={h.name}>{h.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>★ {h.rating || 'N/A'}</p>
              {h.price && <p style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 700 }}>₹{Math.round(h.price).toLocaleString()} <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>total</span></p>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function TopAttractions({ attractions }) {
  if (!attractions?.length) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} style={{ marginTop: '2rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MapPin size={18} color="#8B5CF6" /> Top Attractions
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {attractions.slice(0, 6).map((a, i) => (
          <div key={i} className="bg-bg-glass backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 8, background: a.photo ? `url(${a.photo}) center/cover` : 'rgba(139,92,246,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!a.photo && <Navigation size={24} color="#8B5CF6" />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }} className="line-clamp-1" title={a.name}>{a.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }} className="line-clamp-1">{a.category || a.kinds?.replace(/,/g, ', ')}</p>
              {a.rating > 0 && <p style={{ fontSize: '0.75rem', color: '#FCD34D', fontWeight: 600, marginTop: '0.2rem' }}>★ {a.rating}</p>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
