// src/pages/Dashboard/MyTrips.jsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Trash2, Copy, Heart } from 'lucide-react'
import { fetchMyTrips, deleteTrip, likeTrip, cloneTrip, selectTrips, selectTripsLoading } from '@/features/trips/tripsSlice'
import { SkeletonCard } from '@/components/common/Loader'
import { Link } from 'react-router-dom'

export default function MyTrips() {
  const dispatch = useDispatch()
  const trips    = useSelector(selectTrips)
  const loading  = useSelector(selectTripsLoading)

  useEffect(() => { dispatch(fetchMyTrips({ page: 1, limit: 20 })) }, [dispatch])

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>My <span className="gradient-text">Trips</span></h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>{trips.length} trip{trips.length !== 1 ? 's' : ''} planned</p>
        </div>
        <Link to="/dashboard/planner" className="btn btn-primary btn-sm">+ Plan New Trip</Link>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: 56, marginBottom: '1rem' }}>✈️</div>
          <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No trips yet</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Start planning your first AI-powered trip!</p>
          <Link to="/dashboard/planner" className="btn btn-primary">Plan a Trip</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {trips.map((trip, i) => (
            <motion.div key={trip._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card card-hover">
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{trip.destination}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{trip.planData?.meta?.total_days}d</span>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>from {trip.source} • {trip.numTravelers} traveler{trip.numTravelers > 1 ? 's' : ''}</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Budget: ₹{Number(trip.budget).toLocaleString()}</p>
              </div>
              {trip.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {trip.tags.slice(0, 4).map(t => <span key={t} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 99 }}>#{t}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)' }}>
                <button onClick={() => dispatch(likeTrip(trip._id))} className="btn btn-ghost btn-sm" style={{ color: trip.isLiked ? '#f87171' : undefined }}>
                  <Heart size={14} fill={trip.isLiked ? 'currentColor' : 'none'} /> {trip.likesCount || 0}
                </button>
                <button onClick={() => dispatch(cloneTrip(trip._id))} className="btn btn-ghost btn-sm"><Copy size={14} /></button>
                <button onClick={() => { if (window.confirm('Delete this trip?')) dispatch(deleteTrip(trip._id)) }}
                  className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--color-accent-red)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
