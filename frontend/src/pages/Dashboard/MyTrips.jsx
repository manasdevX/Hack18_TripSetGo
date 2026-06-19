// src/pages/Dashboard/MyTrips.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Trash2, Copy, Heart, Share2, ExternalLink, Users, LogOut, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMyTrips, deleteTrip, likeTrip, cloneTrip, shareTrip, selectTrips, selectTripsLoading } from '@/features/trips/tripsSlice'
import { selectUser } from '@/features/auth/authSlice'
import api from '@/services/api'
import { SkeletonCard } from '@/components/common/Loader'

export default function MyTrips() {
  const dispatch       = useDispatch()
  const trips          = useSelector(selectTrips)
  const loading        = useSelector(selectTripsLoading)
  const currentUser    = useSelector(selectUser)
  
  const [activeTab, setActiveTab]         = useState('owned') // 'owned' | 'shared'
  const [sharedTrips, setSharedTrips]     = useState([])
  const [loadingShared, setLoadingShared] = useState(false)
  const [sharing, setSharing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmLeave, setConfirmLeave]   = useState(null)

  useEffect(() => { 
    dispatch(fetchMyTrips({ page: 1, limit: 20 })) 
  }, [dispatch])

  const fetchShared = async () => {
    setLoadingShared(true)
    try {
      const res = await api.get('/api/v1/trips/collaborations')
      setSharedTrips(res.data.data)
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to load shared trips' } }))
    } finally {
      setLoadingShared(false)
    }
  }

  useEffect(() => {
    let active = true
    if (activeTab === 'shared') {
      Promise.resolve().then(() => {
        if (active) fetchShared()
      })
    }
    return () => {
      active = false
    }
  }, [activeTab])

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

  const handleInvitation = async (tripId, accept) => {
    try {
      await api.post(`/api/v1/trips/${tripId}/collaborators/respond`, { accept })
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'success', message: accept ? 'Invitation accepted!' : 'Invitation declined' } 
      }))
      fetchShared()
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'error', message: err.response?.data?.message || 'Failed to respond to invitation' } 
      }))
    }
  }

  const handleLeaveTrip = async (tripId) => {
    try {
      await api.delete(`/api/v1/trips/${tripId}/collaborators/${currentUser?._id}`)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Left the collaborative trip' } }))
      setConfirmLeave(null)
      fetchShared()
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to leave the trip' } }))
    }
  }

  const renderTripsGrid = (tripsList, isOwned) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {tripsList.map((trip, i) => {
          // Identify collaborative invitation status for current user
          const selfCollab = !isOwned && trip.collaborators?.find(c => 
            c.userId === currentUser?._id || c.userId?._id === currentUser?._id
          )
          const isPending = selfCollab?.status === 'pending'
          const role = selfCollab?.role || 'editor'

          return (
            <motion.div key={trip._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{trip.destination}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{trip.planData?.meta?.total_days}d</span>
                    
                    {/* Only allow viewing if invitation is accepted */}
                    {!isPending ? (
                      <Link to={`/trips/${trip._id}`} title="View full trip" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={13} />
                      </Link>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>Pending Invite</span>
                    )}
                  </div>
                </div>
                
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                  from {trip.source} • {trip.numTravelers} traveler{trip.numTravelers > 1 ? 's' : ''}
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  Budget: ₹{Number(trip.budget).toLocaleString()}
                </p>

                {!isOwned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-accent-primary)' }}>
                    <Users size={12} />
                    <span>Owner: {trip.userId?.name}</span>
                    <span style={{ textTransform: 'capitalize', background: 'rgba(129, 140, 248, 0.1)', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem' }}>
                      {role}
                    </span>
                  </div>
                )}
              </div>

              {trip.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', margin: '0.875rem 0' }}>
                  {trip.tags.slice(0, 4).map(t => (
                    <span key={t} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 99 }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Banner for Pending Invitation */}
              {isPending ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)' }}>
                  <button onClick={() => handleInvitation(trip._id, true)} className="btn btn-primary btn-sm" style={{ flex: 1, gap: '0.25rem' }}>
                    <Check size={14} /> Accept
                  </button>
                  <button onClick={() => handleInvitation(trip._id, false)} className="btn btn-secondary btn-sm" style={{ flex: 1, gap: '0.25rem' }}>
                    <X size={14} /> Decline
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
                  <button onClick={() => dispatch(likeTrip(trip._id))} className="btn btn-ghost btn-sm" style={{ color: trip.isLiked ? '#f87171' : undefined }}>
                    <Heart size={14} fill={trip.isLiked ? 'currentColor' : 'none'} /> {trip.likesCount || 0}
                  </button>
                  
                  {isOwned ? (
                    <>
                      <button onClick={() => dispatch(cloneTrip(trip._id))} className="btn btn-ghost btn-sm" title="Clone trip">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleShare(trip._id)} disabled={sharing === trip._id} className="btn btn-ghost btn-sm" title="Copy share link">
                        <Share2 size={14} />{sharing === trip._id ? ' …' : ''}
                      </button>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        {confirmDelete === trip._id ? (
                          <>
                            <button onClick={() => { dispatch(deleteTrip(trip._id)); setConfirmDelete(null) }} className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                              Delete
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDelete(trip._id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-red)' }} title="Delete trip">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      {confirmLeave === trip._id ? (
                        <>
                          <button onClick={() => handleLeaveTrip(trip._id)} className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                            Leave
                          </button>
                          <button onClick={() => setConfirmLeave(null)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmLeave(trip._id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-red)' }} title="Leave collaborative trip">
                          <LogOut size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    )
  }

  const renderActiveGrid = () => {
    if (activeTab === 'owned') {
      if (loading) {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )
      }
      if (trips.length === 0) {
        return (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>✈️</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No trips yet</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Start planning your first AI-powered trip!</p>
            <Link to="/dashboard/planner" className="btn btn-primary">Plan a Trip</Link>
          </div>
        )
      }
      return renderTripsGrid(trips, true)
    } else {
      if (loadingShared) {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )
      }
      if (sharedTrips.length === 0) {
        return (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>🤝</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No shared trips</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>Trips you are invited to collaborate on will appear here.</p>
          </div>
        )
      }
      return renderTripsGrid(sharedTrips, false)
    }
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Trips <span className="gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {activeTab === 'owned' 
              ? `${trips.length} trip${trips.length !== 1 ? 's' : ''} planned` 
              : `${sharedTrips.length} collaboration${sharedTrips.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <Link to="/dashboard/planner" className="btn btn-primary btn-sm">+ Plan New Trip</Link>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('owned')} className={`btn btn-ghost`} 
          style={{ 
            borderRadius: '0', borderBottom: activeTab === 'owned' ? '2px solid var(--color-accent-primary)' : 'none', 
            color: activeTab === 'owned' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            fontWeight: 600, paddingBottom: '0.75rem'
          }}>
          My Trips
        </button>
        <button onClick={() => setActiveTab('shared')} className={`btn btn-ghost`} 
          style={{ 
            borderRadius: '0', borderBottom: activeTab === 'shared' ? '2px solid var(--color-accent-primary)' : 'none', 
            color: activeTab === 'shared' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            fontWeight: 600, paddingBottom: '0.75rem'
          }}>
          Shared with Me
        </button>
      </div>

      {renderActiveGrid()}
    </div>
  )
}
