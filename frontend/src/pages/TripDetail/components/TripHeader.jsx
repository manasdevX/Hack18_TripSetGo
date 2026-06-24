import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Globe, Lock, Copy, UserPlus, Calendar, Users, DollarSign, Heart } from 'lucide-react'

function InfoChip({ icon, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.75rem' }}>
      {icon}{label}
    </span>
  )
}

export default function TripHeader({
  trip, canEdit, isOwner, isCustomized, editMode, setEditMode,
  handleInitializeItinerary, setInviteModal, copyLink, copied, days
}) {
  return (
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
  )
}
