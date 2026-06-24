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
import TripHeader from './components/TripHeader'
import TripItinerary from './components/TripItinerary'
import { CollaboratorsList, BudgetBreakdown, LiveWeather, LiveHotels, TopAttractions, AITips } from './components/TripWidgets'
import InviteModal from './components/InviteModal'

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

        <TripHeader
          trip={trip} canEdit={canEdit} isOwner={isOwner} isCustomized={isCustomized}
          editMode={editMode} setEditMode={setEditMode}
          handleInitializeItinerary={handleInitializeItinerary}
          setInviteModal={setInviteModal} copyLink={copyLink} copied={copied} days={days}
        />

        <CollaboratorsList trip={trip} isOwner={isOwner} handleRemoveCollaborator={handleRemoveCollaborator} />
        <BudgetBreakdown breakdown={breakdown} />
        
        <TripItinerary
          trip={trip} plan={plan} editMode={editMode} handleAddDay={handleAddDay} handleDeleteDay={handleDeleteDay}
          newActivityDay={newActivityDay} setNewActivityDay={setNewActivityDay}
          activityForm={activityForm} setActivityForm={setActivityForm}
          handleAddActivity={handleAddActivity} handleDeleteActivity={handleDeleteActivity}
        />

        <AITips suggestions={plan.ai_suggestions} />
        <LiveWeather weather={plan.weather} />
        <LiveHotels hotels={plan.hotelResult?.options} />
        <TopAttractions attractions={plan.attractions} />
      </div>

      <InviteModal
        inviteModal={inviteModal} setInviteModal={setInviteModal}
        handleInvite={handleInvite} inviteEmail={inviteEmail} setInviteEmail={setInviteEmail}
        inviteRole={inviteRole} setInviteRole={setInviteRole} inviting={inviting}
      />
    </div>
  )
}
