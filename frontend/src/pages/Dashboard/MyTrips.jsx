// src/pages/Dashboard/MyTrips.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Trash2, Copy, Heart, Share2, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMyTrips, deleteTrip, likeTrip, cloneTrip, shareTrip, selectTrips, selectTripsLoading } from '@/features/trips/tripsSlice'
import { SkeletonCard } from '@/components/common/Loader'

export default function MyTrips() {
  const dispatch       = useDispatch()
  const trips          = useSelector(selectTrips)
  const loading        = useSelector(selectTripsLoading)
  const [sharing, setSharing]           = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { dispatch(fetchMyTrips({ page: 1, limit: 20 })) }, [dispatch])

  const handleShare = async (tripId) => {
    setSharing(tripId)
    try {
      const result = await dispatch(shareTrip(tripId)).unwrap()
      await navigator.clipboard.writeText(result.shareUrl)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Share link copied to clipboard!' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to generate share link' } }))
    } finally {
      setSharing(null)
    }
  }

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{trip.destination}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{trip.planData?.meta?.total_days}d</span>
                    <Link to={`/trips/${trip._id}`} title="View full trip" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
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
                <button onClick={() => dispatch(cloneTrip(trip._id))} className="btn btn-ghost btn-sm" title="Clone trip">
                  <Copy size={14} />
                </button>
                <button onClick={() => handleShare(trip._id)} disabled={sharing === trip._id} className="btn btn-ghost btn-sm" title="Copy share link">
                  <Share2 size={14} />{sharing === trip._id ? ' …' : ''}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  {confirmDelete === trip._id ? (
                    <>
                      <button
                        onClick={() => { dispatch(deleteTrip(trip._id)); setConfirmDelete(null) }}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(trip._id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-accent-red)' }}
                      title="Delete trip"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
