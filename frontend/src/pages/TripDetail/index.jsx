// src/pages/TripDetail/index.jsx — Collaborative, real-time trip view & editor
import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Calendar, Users, DollarSign, Heart, Copy, UserPlus, Plus, Trash2, X, Globe, Lock, Clock, MapPin, CloudRain, Hotel, Navigation } from 'lucide-react'
import { selectUser } from '@/features/auth/authSlice'
import { useTripCollaboration } from '@/hooks/useTripCollaboration'
import api from '@/services/api'
import Loader from '@/components/common/Loader'
import Navbar from '@/components/layout/Navbar'
import Badge from '@/components/common/Badge'

function InfoChip({ icon, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.75rem' }}>
      {icon}{label}
    </span>
  )
}

export default function TripDetail() {
  const { id }            = useParams()
  const currentUser       = useSelector(selectUser)

  const [trip, setTrip]   = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  // Edit Mode states
  const [editMode, setEditMode] = useState(false)
  const [newActivityDay, setNewActivityDay] = useState(null)
  const [activityForm, setActivityForm] = useState({ name: '', notes: '', cost: '', startTime: '' })

  // Invite Modal states
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('editor')
  const [inviting, setInviting]       = useState(false)

  const fetchTripData = useCallback(() => {
    api.get(`/api/v1/trips/${id}`)
      .then(res => setTrip(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Trip not found or is private'))
      .finally(() => setLoading(false))
  }, [id])

  // Load trip details
  useEffect(() => {
    fetchTripData()
  }, [fetchTripData])

  // Real-time socket collaboration
  const { presence } = useTripCollaboration(id, fetchTripData)

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Permissions check
  const isOwner = currentUser && trip && (trip.userId?._id === currentUser._id || trip.userId === currentUser._id)
  const isEditor = currentUser && trip && trip.collaborators?.some(c => 
    (c.userId?._id === currentUser._id || c.userId === currentUser._id) && c.status === 'accepted' && c.role === 'editor'
  )
  const canEdit = isOwner || isEditor

  // Convert static AI itinerary to database format
  const handleInitializeItinerary = async () => {
    if (!trip || !trip.planData?.itinerary) return
    const plan = trip.planData
    const converted = plan.itinerary.map(d => {
      const dayActivities = []
      const slots = ['morning', 'afternoon', 'evening']
      slots.forEach(slot => {
        if (d[slot]?.activities) {
          d[slot].activities.forEach(act => {
            dayActivities.push({
              targetType: 'Custom',
              name: act.name,
              notes: act.description || '',
              cost: act.cost || 0
            })
          })
        }
      })
      return {
        day: d.day,
        date: trip.startDate ? new Date(new Date(trip.startDate).getTime() + (d.day - 1) * 24 * 60 * 60 * 1000) : new Date(),
        activities: dayActivities
      }
    })

    try {
      setLoading(true)
      const res = await api.put(`/api/v1/trips/${id}/itinerary`, { itinerary: converted })
      setTrip(res.data.data)
      setEditMode(true)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Itinerary unlocked for editing!' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to initialize itinerary' } }))
    } finally {
      setLoading(false)
    }
  }

  // Itinerary API Calls
  const handleAddDay = async () => {
    const nextDay = (trip.itinerary?.length || 0) + 1
    const nextDate = trip.startDate ? new Date(new Date(trip.startDate).getTime() + (nextDay - 1) * 24 * 60 * 60 * 1000) : new Date()
    try {
      const res = await api.post(`/api/v1/trips/${id}/itinerary/day`, { day: nextDay, date: nextDate, activities: [] })
      setTrip(res.data.data)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: `Day ${nextDay} added` } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to add day' } }))
    }
  }

  const handleDeleteDay = async (dayNum) => {
    try {
      const res = await api.delete(`/api/v1/trips/${id}/itinerary/day/${dayNum}`)
      setTrip(res.data.data)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: `Day ${dayNum} removed` } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to delete day' } }))
    }
  }

  const handleAddActivity = async (dayNum) => {
    if (!activityForm.name.trim()) return
    const dayEntry = trip.itinerary?.find(d => d.day === dayNum)
    if (!dayEntry) return

    const updatedActivities = [...(dayEntry.activities || []), {
      targetType: 'Custom',
      name: activityForm.name,
      notes: activityForm.notes,
      cost: Number(activityForm.cost) || 0,
      startTime: activityForm.startTime ? new Date(activityForm.startTime) : undefined
    }]

    try {
      const res = await api.put(`/api/v1/trips/${id}/itinerary/day/${dayNum}`, { activities: updatedActivities })
      setTrip(res.data.data)
      setActivityForm({ name: '', notes: '', cost: '', startTime: '' })
      setNewActivityDay(null)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Activity added successfully!' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to add activity' } }))
    }
  }

  const handleDeleteActivity = async (dayNum, activityIdx) => {
    const dayEntry = trip.itinerary?.find(d => d.day === dayNum)
    if (!dayEntry) return

    const updatedActivities = dayEntry.activities.filter((_, idx) => idx !== activityIdx)

    try {
      const res = await api.put(`/api/v1/trips/${id}/itinerary/day/${dayNum}`, { activities: updatedActivities })
      setTrip(res.data.data)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Activity deleted' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to delete activity' } }))
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await api.post(`/api/v1/trips/${id}/collaborators`, { email: inviteEmail, role: inviteRole })
      setTrip(prev => ({ ...prev, collaborators: res.data.data }))
      setInviteEmail('')
      setInviteModal(false)
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Collaborator invited successfully!' } }))
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'error', message: err.response?.data?.message || 'Failed to send invitation' } 
      }))
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveCollaborator = async (userId) => {
    try {
      await api.delete(`/api/v1/trips/${id}/collaborators/${userId}`)
      setTrip(prev => ({ 
        ...prev, 
        collaborators: prev.collaborators.filter(c => c.userId?._id !== userId) 
      }))
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Collaborator removed' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to remove collaborator' } }))
    }
  }

  if (loading) return <Loader fullScreen text="Loading trip details..." />

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: '8rem auto', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: 56, marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Trip Unavailable</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>{error}</p>
          <Link to="/" className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-sm px-5 py-2.5 rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn">Go Home</Link>
        </div>
      </div>
    )
  }

  const plan      = trip.planData || {}
  const meta      = plan.meta || {}
  const days      = meta.total_days || 0
  const breakdown = plan.budget_breakdown_estimate || {}
  const isCustomized = trip.itinerary && trip.itinerary.length > 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Navbar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '7rem 1.5rem 4rem' }}>
        
        {/* Real-time Presence Indicator */}
        {presence.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid rgba(52, 211, 153, 0.2)', marginBottom: '1.5rem', width: 'fit-content' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399' }}>Active Planners:</span>
            <div style={{ display: 'flex', gap: '-0.25rem', marginLeft: '0.25rem' }}>
              {presence.map((u, idx) => (
                <div key={idx} style={{ position: 'relative', marginLeft: idx > 0 ? '-8px' : '0' }}>
                  <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} title={u.name}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid var(--color-bg-primary)', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, margin: 0 }}>
                  {trip.source} → <span className="bg-gradient-primary bg-clip-text text-transparent">{trip.destination}</span>
                </h1>
                {trip.isPublic ? <Globe size={16} title="Public" /> : <Lock size={16} title="Private" />}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                <span>Planned by <strong>{trip.userId?.name}</strong></span>
                {trip.collaborators?.length > 0 && (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    • {trip.collaborators.filter(c => c.status === 'accepted').length} collaborator(s)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {canEdit && (
                <>
                  {isCustomized ? (
                    <button onClick={() => setEditMode(!editMode)} className={`inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${editMode ? 'bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn' : 'bg-transparent text-text-primary border border-solid border-border hover:border-accent-primary hover:bg-[rgba(99,102,241,0.1)]'}`}>
                      {editMode ? 'Finish Editing' : 'Edit Itinerary'}
                    </button>
                  ) : (
                    <button onClick={handleInitializeItinerary} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn">
                      Customize Itinerary
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => setInviteModal(true)} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border border-solid border-border cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-primary hover:border-accent-primary hover:bg-[rgba(99,102,241,0.1)]" style={{ gap: '0.375rem' }}>
                      <UserPlus size={14} /> Invite
                    </button>
                  )}
                </>
              )}
              <button onClick={copyLink} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border border-solid border-border cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-primary hover:border-accent-primary hover:bg-[rgba(99,102,241,0.1)]" style={{ gap: '0.375rem' }}>
                <Copy size={14} />{copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Info chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '2rem' }}>
            {days > 0 && <InfoChip icon={<Calendar size={13} />} label={`${days} days`} />}
            <InfoChip icon={<Users size={13} />} label={`${trip.numTravelers} traveler${trip.numTravelers > 1 ? 's' : ''} · ${trip.groupType}`} />
            <InfoChip icon={<DollarSign size={13} />} label={`₹${Number(trip.budget).toLocaleString()} budget`} />
            {trip.likesCount > 0 && <InfoChip icon={<Heart size={13} />} label={`${trip.likesCount} likes`} />}
          </div>
        </motion.div>

        {/* Collaborators List (rendered if visible to owner/editor) */}
        {trip.collaborators?.length > 0 && (
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
        )}

        {/* Budget breakdown */}
        {Object.keys(breakdown).length > 0 && (
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
        )}

        {/* Custom Interactive / Collaborative Itinerary */}
        {isCustomized ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                Collaborative <span className="bg-gradient-primary bg-clip-text text-transparent">Itinerary</span>
              </h2>
              {editMode && (
                <button onClick={handleAddDay} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border border-solid border-border cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-primary hover:border-accent-primary hover:bg-[rgba(99,102,241,0.1)]" style={{ gap: '0.25rem' }}>
                  <Plus size={14} /> Add Day
                </button>
              )}
            </div>

            {trip.itinerary.map((day) => (
              <div key={day._id || day.day} className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                    Day {day.day}
                    {day.date && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>{new Date(day.date).toLocaleDateString()}</span>}
                  </p>
                  {editMode && (
                    <button onClick={() => handleDeleteDay(day.day)} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: 'var(--color-accent-red)', padding: '4px' }} title="Delete Day">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Day Activity List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: day.activities?.length > 0 ? '1rem' : '0' }}>
                  {day.activities?.map((act, actIdx) => (
                    <div key={act._id || actIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {act.startTime && <span style={{ color: 'var(--color-accent-primary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={11} /> {new Date(act.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          {act.name}
                        </p>
                        {act.notes && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>{act.notes}</p>}
                        {act.cost > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--color-accent-green)', fontWeight: 600, marginTop: '0.2rem' }}>₹{act.cost.toLocaleString()}</p>}
                      </div>

                      {editMode && (
                        <button onClick={() => handleDeleteActivity(day.day, actIdx)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }} className="transition-colors duration-150 hover:text-accent-red">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Inline Form to Add Activity */}
                {editMode && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {newActivityDay === day.day ? (
                      <div className="bg-bg-glass backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                          <input type="text" placeholder="Activity name..." className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" style={{ padding: '0.5rem' }} value={activityForm.name} onChange={e => setActivityForm(prev => ({ ...prev, name: e.target.value }))} />
                          <input type="number" placeholder="Cost (₹)..." className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" style={{ padding: '0.5rem' }} value={activityForm.cost} onChange={e => setActivityForm(prev => ({ ...prev, cost: e.target.value }))} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input type="time" className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" style={{ padding: '0.5rem' }} value={activityForm.startTime} onChange={e => setActivityForm(prev => ({ ...prev, startTime: e.target.value }))} />
                          <input type="text" placeholder="Description/notes..." className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" style={{ padding: '0.5rem' }} value={activityForm.notes} onChange={e => setActivityForm(prev => ({ ...prev, notes: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleAddActivity(day.day)} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn" style={{ padding: '4px 12px' }}>Save</button>
                          <button onClick={() => setNewActivityDay(null)} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border border-solid border-border cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-primary hover:border-accent-primary hover:bg-[rgba(99,102,241,0.1)]" style={{ padding: '4px 12px' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setNewActivityDay(day.day); setActivityForm({ name: '', notes: '', cost: '', startTime: '' }) }} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--color-border)' }}>
                        <Plus size={14} /> Add Activity
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        ) : (
          /* Static AI suggestion itinerary */
          plan.itinerary?.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                  AI Recommended <span className="bg-gradient-primary bg-clip-text text-transparent">Itinerary</span>
                </h2>
              </div>
              
              {plan.itinerary.map(day => (
                <div key={day.day} className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                    Day {day.day}
                    {day.date && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>{new Date(day.date).toLocaleDateString()}</span>}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {['morning', 'afternoon', 'evening'].map((key) => {
                      const slot = day[key]
                      const colors = { morning: '#f59e0b', afternoon: '#6366f1', evening: '#8b5cf6' }
                      if (!slot?.activities?.length) return null
                      return (
                        <div key={key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '0.75rem', borderLeft: `3px solid ${colors[key]}` }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: colors[key], marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</p>
                          {slot.activities.slice(0, 2).map((act, idx) => (
                            <div key={idx} style={{ marginBottom: '0.375rem' }}>
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
              ))}
            </motion.div>
          )
        )}

        {/* AI suggestions */}
        {plan.ai_suggestions?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>AI Tips</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {plan.ai_suggestions.map((s, i) => (
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
        )}

        {/* Live Weather Forecast */}
        {plan.weather?.available && plan.weather.forecast?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginTop: '2rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CloudRain size={18} color="#F59E0B" /> Trip Weather Forecast
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {plan.weather.forecast.slice(0, 5).map((w, i) => (
                <div key={i} className="bg-bg-card border border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>{new Date(w.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <div style={{ fontSize: '1.75rem', margin: '0.5rem 0' }}>{w.conditionIcon || '🌤️'}</div>
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{Math.round(w.tempMaxC)}° <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{Math.round(w.tempMinC)}°</span></p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-accent-blue)', marginTop: '0.25rem' }}>💧 {Math.round(w.rainProbability)}%</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live Hotel Options */}
        {plan.hotelResult?.options?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ marginTop: '2rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Hotel size={18} color="#0EA5E9" /> Available Stays
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {plan.hotelResult.options.slice(0, 4).map((h, i) => (
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
        )}

        {/* Top Attractions */}
        {plan.attractions?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} style={{ marginTop: '2rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="#8B5CF6" /> Top Attractions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {plan.attractions.slice(0, 6).map((a, i) => (
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
        )}
      </div>

      {/* Invite Collaborator Modal */}
      <AnimatePresence>
        {inviteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ width: '90%', maxWidth: '450px', background: 'var(--color-bg-card)', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Invite Collaborator</h3>
                <button onClick={() => setInviteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>User Email</label>
                  <input type="email" required placeholder="collaborator@example.com" className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Permission Role</label>
                  <select className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                    <option value="editor">Editor (Can edit itinerary)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
                <button type="submit" disabled={inviting} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-sm px-5 py-2.5 rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn disabled:opacity-50 disabled:cursor-not-allowed" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {inviting ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
