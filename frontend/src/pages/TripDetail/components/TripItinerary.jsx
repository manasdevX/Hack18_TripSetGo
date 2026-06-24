import React from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Clock } from 'lucide-react'

export default function TripItinerary({
  trip, editMode, handleAddDay, handleDeleteDay,
  newActivityDay, setNewActivityDay,
  activityForm, setActivityForm,
  handleAddActivity, handleDeleteActivity,
  plan
}) {
  const isCustomized = trip.itinerary && trip.itinerary.length > 0

  if (isCustomized) {
    return (
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
    )
  }

  // Static AI suggestion itinerary
  if (plan?.itinerary?.length > 0) {
    return (
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
  }

  return null
}
