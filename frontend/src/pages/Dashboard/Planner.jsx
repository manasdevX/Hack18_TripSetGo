// src/pages/Dashboard/Planner.jsx
import { useState, useEffect, Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, RotateCcw, DollarSign, Train, Hotel, Utensils, CalendarDays, Lightbulb, RefreshCw, Lock, Unlock, Layers, Save, Trash2, Download, Backpack } from 'lucide-react'
import {
  generatePlan, updateForm, resetPlan, regenerateDay, toggleDayLock,
  fetchDrafts, saveDraft, deleteDraft, loadDraft,
  selectPlan, selectPlannerForm, selectPlannerLoading, selectLiveBudget, selectBudgetStatus,
  selectTransport, selectHotel, selectFood, toggleActivity, setActiveDay, setActiveTab,
  selectPlanner,
} from '@/features/planner/plannerSlice'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Loader from '@/components/common/Loader'
import Modal from '@/components/common/Modal'

const GROUP_TYPES = [
  { value: 'solo',     label: '🧳 Solo' },
  { value: 'couple',   label: '💑 Couple' },
  { value: 'family',   label: '👨‍👩‍👧 Family' },
  { value: 'friends',  label: '👯 Friends' },
  { value: 'business', label: '💼 Business' },
]
const PACE_OPTIONS = [
  { value: 'relaxed',  label: '🌿 Relaxed' },
  { value: 'balanced', label: '⚖️ Balanced' },
  { value: 'packed',   label: '⚡ Packed' },
]
const PREFERENCES = [
  { value: 'beach',       label: '🏖️ Beach' },
  { value: 'mountains',   label: '⛰️ Mountains' },
  { value: 'culture',     label: '🏛️ Culture' },
  { value: 'food',        label: '🍜 Food' },
  { value: 'adventure',   label: '🪂 Adventure' },
  { value: 'nightlife',   label: '🎉 Nightlife' },
  { value: 'wildlife',    label: '🦁 Wildlife' },
  { value: 'relaxation',  label: '🧘 Relaxation' },
  { value: 'shopping',    label: '🛍️ Shopping' },
  { value: 'history',     label: '🏰 History' },
]

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// Flatten a draft's stored selections into a comparable summary.
function draftSummary(d) {
  const s = d.selections || {}
  return {
    transport:  s.transport?.mode || '—',
    hotel:      s.hotel?.name || '—',
    food:       s.food?.name || '—',
    activities: Array.isArray(s.activities) ? s.activities.length : 0,
    total:      d.liveBudget || 0,
  }
}

function BudgetBar({ liveBudget, totalBudget, status }) {
  const pct = totalBudget > 0 ? Math.min((liveBudget / totalBudget) * 100, 100) : 0
  const colors = { green: '#10b981', amber: '#f59e0b', red: '#ef4444', neutral: '#6366f1' }
  const color = colors[status] || colors.neutral
  const remaining = totalBudget - liveBudget

  return (
    <div className="glass" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={16} style={{ color }} />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Live Budget Tracker</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 800, fontSize: '1.125rem', color }}>₹{liveBudget.toLocaleString()}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
            {remaining >= 0 ? `₹${remaining.toLocaleString()} left` : `₹${Math.abs(remaining).toLocaleString()} over budget`}
          </p>
        </div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ height: '100%', background: color, borderRadius: 99, boxShadow: `0 0 10px ${color}` }}
          className={remaining < 0 ? 'animate-pulse' : ''}
        />
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
        Total budget: ₹{Number(totalBudget).toLocaleString()}
      </p>
    </div>
  )
}

function TripForm({ form, onSubmit, onChange, loading }) {
  const [prefs, setPrefs] = useState(form.preferences || [])
  const togglePref = (p) => {
    const next = prefs.includes(p) ? prefs.filter(x => x !== p) : [...prefs, p]
    setPrefs(next)
    onChange({ preferences: next })
  }
  return (
    <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ width: 40, height: 40, background: 'var(--gradient-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Plan with AI</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Powered by Gemini — get a full plan in seconds</p>
        </div>
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Input label="From" placeholder="e.g. Mumbai" required value={form.source} onChange={e => onChange({ source: e.target.value })} />
          <Input label="To" placeholder="e.g. Goa" required value={form.destination} onChange={e => onChange({ destination: e.target.value })} />
          <Input label="Start Date" type="date" required value={form.startDate} onChange={e => onChange({ startDate: e.target.value })} />
          <Input label="End Date" type="date" required value={form.endDate} onChange={e => onChange({ endDate: e.target.value })} />
          <Input label="Budget (₹)" type="number" required placeholder="50000" value={form.budget} onChange={e => onChange({ budget: e.target.value })} icon={<DollarSign size={15} />} />
          <Input label="Travelers" type="number" min={1} max={30} required value={form.numTravelers} onChange={e => onChange({ numTravelers: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Group Type</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {GROUP_TYPES.map(g => (
              <button key={g.value} type="button" onClick={() => onChange({ groupType: g.value })}
                className={`btn btn-sm ${form.groupType === g.value ? 'btn-primary' : 'btn-secondary'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Pace</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PACE_OPTIONS.map(p => (
              <button key={p.value} type="button" onClick={() => onChange({ pace: p.value })}
                className={`btn btn-sm ${(form.pace || 'balanced') === p.value ? 'btn-primary' : 'btn-secondary'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            Preferences <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>({prefs.length} selected)</span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PREFERENCES.map(p => (
              <button key={p.value} type="button" onClick={() => togglePref(p.value)}
                className={`btn btn-sm ${prefs.includes(p.value) ? 'btn-primary' : 'btn-secondary'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" loading={loading} size="lg" icon={<Send size={16} />} style={{ width: '100%', marginTop: '0.5rem' }}>
          Generate AI Plan
        </Button>
      </form>
    </div>
  )
}

export default function Planner() {
  const dispatch   = useDispatch()
  const plan       = useSelector(selectPlan)
  const form       = useSelector(selectPlannerForm)
  const loading    = useSelector(selectPlannerLoading)
  const liveBudget = useSelector(selectLiveBudget)
  const status     = useSelector(selectBudgetStatus)
  const { selections, activeDay, activeTab, lockedDays, regeneratingDay, tripId, drafts, draftsLoading, savingDraft } = useSelector(selectPlanner)
  const error      = useSelector(s => s.planner.error)

  const [compareIds, setCompareIds] = useState([])
  const [saveDraftOpen, setSaveDraftOpen] = useState(false)
  const [draftName, setDraftName] = useState('')

  // Load saved drafts when the Drafts tab is opened.
  useEffect(() => {
    if (activeTab === 'drafts' && tripId) dispatch(fetchDrafts(tripId))
  }, [activeTab, tripId, dispatch])

  const handleFormChange = (updates) => dispatch(updateForm(updates))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await dispatch(generatePlan(form))
  }

  const handleRegenerate = async () => {
    try {
      const r = await dispatch(regenerateDay({ dayIndex: activeDay })).unwrap()
      window.dispatchEvent(new CustomEvent('toast', { detail: {
        type: 'success',
        message: r.usedFallback ? 'Day refreshed (offline mode)' : 'Day regenerated with AI ✨',
      } }))
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { detail: {
        type: 'error',
        message: typeof err === 'string' ? err : 'Failed to regenerate day',
      } }))
    }
  }

  const toast = (type, message) => window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }))

  const handleSaveDraft = () => {
    if (!tripId) return toast('error', 'Generate a plan before saving a draft')
    setDraftName(`Draft ${drafts.length + 1}`)
    setSaveDraftOpen(true)
  }

  const confirmSaveDraft = async (e) => {
    e.preventDefault()
    try {
      await dispatch(saveDraft({
        tripId,
        name: draftName.trim() || `Draft ${drafts.length + 1}`,
        selections, liveBudget, lockedDays,
      })).unwrap()
      setSaveDraftOpen(false)
      toast('success', 'Draft saved')
    } catch (err) {
      toast('error', typeof err === 'string' ? err : 'Failed to save draft')
    }
  }

  const handleLoadDraft = (d) => {
    dispatch(loadDraft(d))
    dispatch(setActiveTab('transport'))
    toast('success', `Loaded "${d.name}"`)
  }

  const handleDeleteDraft = async (id) => {
    try {
      await dispatch(deleteDraft({ tripId, draftId: id })).unwrap()
      setCompareIds((prev) => prev.filter((x) => x !== id))
    } catch (err) {
      toast('error', typeof err === 'string' ? err : 'Failed to delete draft')
    }
  }

  const toggleCompare = (id) => setCompareIds((prev) => {
    if (prev.includes(id)) return prev.filter((x) => x !== id)
    if (prev.length >= 2) return [prev[1], id] // keep only the last two picked
    return [...prev, id]
  })

  const tabs = [
    { id: 'transport',  label: 'Transport',  icon: <Train size={15} /> },
    { id: 'hotels',     label: 'Hotels',     icon: <Hotel size={15} /> },
    { id: 'food',       label: 'Food',       icon: <Utensils size={15} /> },
    { id: 'itinerary',  label: 'Itinerary',  icon: <CalendarDays size={15} /> },
    { id: 'essentials', label: 'Essentials', icon: <Backpack size={15} /> },
    { id: 'suggestions',label: 'AI Tips',    icon: <Lightbulb size={15} /> },
    { id: 'drafts',     label: 'Drafts',     icon: <Layers size={15} /> },
  ]

  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            AI Trip <span className="gradient-text">Planner</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Describe your trip — Gemini does the rest</p>
        </div>
        {plan && (
          <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => dispatch(resetPlan())}>
            New Plan
          </Button>
        )}
      </div>

      {loading && <Loader text="Gemini AI is crafting your perfect trip..." />}

      {error && !loading && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#f87171' }}>
          ⚠️ {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!plan && !loading ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TripForm form={form} onSubmit={handleSubmit} onChange={handleFormChange} loading={loading} />
          </motion.div>
        ) : plan ? (
          <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Budget tracker */}
            <BudgetBar liveBudget={liveBudget} totalBudget={Number(form.budget)} status={status} />

            {/* Meta */}
            <div className="glass" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div><p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: 2 }}>DESTINATION</p><p style={{ fontWeight: 700 }}>{plan.meta?.destination}</p></div>
              <div><p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: 2 }}>DURATION</p><p style={{ fontWeight: 700 }}>{plan.meta?.total_days} days</p></div>
              <div><p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: 2 }}>THEME</p><p style={{ fontWeight: 700, textTransform: 'capitalize' }}>{plan.meta?.theme}</p></div>
              <div><p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: 2 }}>TRAVELERS</p><p style={{ fontWeight: 700 }}>{form.numTravelers} {form.groupType}</p></div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => dispatch(setActiveTab(t.id))}
                  className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '0.375rem' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'transport' && plan.transport_options && (
                <motion.div key="transport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {plan.transport_options.map((t, i) => (
                      <div key={i} onClick={() => dispatch(selectTransport(t))}
                        className="card card-hover" style={{ cursor: 'pointer', borderColor: selections.transport?.mode === t.mode ? 'var(--color-accent-primary)' : undefined, background: selections.transport?.mode === t.mode ? 'rgba(129,140,248,0.1)' : undefined, boxShadow: selections.transport?.mode === t.mode ? '0 0 20px rgba(129, 140, 248, 0.3)' : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <p style={{ fontWeight: 700 }}>{t.mode}</p>
                          {t.recommended && <span className="badge badge-green">Recommended</span>}
                        </div>
                        <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent-primary)' }}>₹{t.total_cost?.toLocaleString()}</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>₹{t.cost_per_person?.toLocaleString()} per person • Comfort: {t.comfort}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'hotels' && plan.hotel_options && (
                <motion.div key="hotels" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {plan.hotel_options.map((h, i) => (
                      <div key={i} onClick={() => dispatch(selectHotel(h))}
                        className="card card-hover" style={{ cursor: 'pointer', borderColor: selections.hotel?.name === h.name ? 'var(--color-accent-primary)' : undefined, background: selections.hotel?.name === h.name ? 'rgba(129,140,248,0.1)' : undefined, boxShadow: selections.hotel?.name === h.name ? '0 0 20px rgba(129, 140, 248, 0.3)' : undefined }}>
                        <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{h.name}</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{h.tier} • ⭐ {h.rating}</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-accent-secondary)' }}>₹{h.price_per_night?.toLocaleString()}<span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/night</span></p>
                        {h.amenities && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{Array.isArray(h.amenities) ? h.amenities.slice(0,3).join(' • ') : h.amenities}</p>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'food' && plan.food_plans && (
                <motion.div key="food" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {plan.food_plans.map((f, i) => (
                      <div key={i} onClick={() => dispatch(selectFood(f))}
                        className="card card-hover" style={{ cursor: 'pointer', borderColor: selections.food?.name === f.name ? 'var(--color-accent-primary)' : undefined, background: selections.food?.name === f.name ? 'rgba(129,140,248,0.1)' : undefined, boxShadow: selections.food?.name === f.name ? '0 0 20px rgba(129, 140, 248, 0.3)' : undefined }}>
                        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{f.name}</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-accent-tertiary)' }}>₹{f.total_cost?.toLocaleString()}</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>₹{f.cost_per_day?.toLocaleString()}/day</p>
                        {f.highlights && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{Array.isArray(f.highlights) ? f.highlights.slice(0,2).join(', ') : f.highlights}</p>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'itinerary' && plan.itinerary && (
                <motion.div key="itinerary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {plan.itinerary.map((day, i) => (
                      <button key={i} onClick={() => dispatch(setActiveDay(i))}
                        className={`btn btn-sm ${activeDay === i ? 'btn-primary' : 'btn-secondary'}`} style={{ gap: '0.3rem' }}>
                        Day {day.day}{lockedDays.includes(i) ? ' 🔒' : ''}
                      </button>
                    ))}
                  </div>
                  {plan.itinerary[activeDay] && (() => {
                    const day = plan.itinerary[activeDay]
                    const isLocked = lockedDays.includes(activeDay)
                    const isRegen  = regeneratingDay === activeDay
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Day toolbar — lock the day or regenerate it with AI */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            {day.theme && <p style={{ fontWeight: 700 }}>{day.theme}</p>}
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                              Day {day.day}{isLocked ? ' • locked' : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => dispatch(toggleDayLock(activeDay))}
                              className={`btn btn-sm ${isLocked ? 'btn-primary' : 'btn-secondary'}`} style={{ gap: '0.3rem' }}
                              title={isLocked ? 'Unlock this day' : 'Lock this day so regeneration preserves it'}>
                              {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {isLocked ? 'Locked' : 'Lock'}
                            </button>
                            <button type="button" onClick={handleRegenerate} disabled={isLocked || isRegen}
                              className="btn btn-secondary btn-sm" style={{ gap: '0.3rem' }}
                              title={isLocked ? 'Unlock to regenerate' : 'Regenerate this day with fresh AI suggestions'}>
                              <RefreshCw size={14} className={isRegen ? 'animate-spin' : ''} /> {isRegen ? 'Regenerating…' : 'Regenerate day'}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: isRegen ? 0.5 : 1, pointerEvents: isRegen ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                        {['morning', 'afternoon', 'evening'].map(slot => (
                          day[slot]?.activities && (
                            <div key={slot} className="card">
                              <p style={{ fontWeight: 700, textTransform: 'capitalize', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {slot === 'morning' ? '🌅' : slot === 'afternoon' ? '☀️' : '🌙'} {slot}
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                {day[slot].activities.map((act, j) => {
                                  const isSelected = selections.activities.some(a => a.day === activeDay && a.slot === slot && a.activity.name === act.name)
                                  return (
                                    <div key={j} onClick={() => dispatch(toggleActivity({ day: activeDay, slot, activity: act }))}
                                      className="card card-hover" style={{ cursor: 'pointer', padding: '0.875rem', borderColor: isSelected ? 'var(--color-accent-primary)' : undefined, background: isSelected ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.02)', boxShadow: isSelected ? '0 0 15px rgba(129, 140, 248, 0.2)' : undefined }}>
                                      <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{act.name}</p>
                                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{act.duration} • ₹{act.cost?.toLocaleString() || 0}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        ))}
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              )}

              {activeTab === 'essentials' && (
                <motion.div key="essentials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {plan.weather && (
                    <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: 34 }}>🌤️</span>
                      <div>
                        <p style={{ fontWeight: 700 }}>Weather{plan.weather.temp_range ? ` · ${plan.weather.temp_range}` : ''}</p>
                        {plan.weather.note && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{plan.weather.note}</p>}
                        {plan.weather.best_season && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Best season: {plan.weather.best_season}</p>}
                      </div>
                    </div>
                  )}
                  {plan.packing_list?.length > 0 ? (
                    <div className="card">
                      <p style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎒 Packing list</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
                        {plan.packing_list.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            <span style={{ color: 'var(--color-accent-green)' }}>✓</span> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : !plan.weather && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                      No weather or packing details for this plan.
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'suggestions' && plan.ai_suggestions && (
                <motion.div key="suggestions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {plan.ai_suggestions.map((s, i) => (
                      <div key={i} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 24 }}>{s.icon || '💡'}</span>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{s.title}</p>
                          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'drafts' && (
                <motion.div key="drafts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Save current selections */}
                  <div className="glass" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>Save this version as a draft</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Current total {inr(liveBudget)} · save different combinations, then compare them</p>
                    </div>
                    <Button size="sm" icon={<Save size={15} />} loading={savingDraft} onClick={handleSaveDraft}>Save draft</Button>
                  </div>

                  {draftsLoading ? (
                    <Loader text="Loading drafts..." />
                  ) : drafts.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                      <Layers size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ fontWeight: 600 }}>No saved drafts yet</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Save a version above, tweak your picks, and compare two side by side.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {drafts.map((d) => {
                          const s = draftSummary(d)
                          const checked = compareIds.includes(d._id)
                          return (
                            <div key={d._id} className="card" style={{ borderColor: checked ? 'var(--color-accent-primary)' : undefined }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                <p style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                                <span style={{ fontWeight: 800, color: 'var(--color-accent-primary)', flexShrink: 0 }}>{inr(s.total)}</span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.875rem' }}>
                                <span>🚆 {s.transport}</span>
                                <span>🏨 {s.hotel}</span>
                                <span>🍽️ {s.food}</span>
                                <span>📍 {s.activities} activit{s.activities === 1 ? 'y' : 'ies'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                                <button onClick={() => handleLoadDraft(d)} className="btn btn-secondary btn-sm" style={{ gap: '0.3rem' }}><Download size={13} /> Load</button>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', marginBottom: 0 }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleCompare(d._id)} /> Compare
                                </label>
                                <button onClick={() => handleDeleteDraft(d._id)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--color-accent-red)', padding: '0.25rem' }} title="Delete draft"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Side-by-side comparison of two drafts */}
                      {compareIds.length === 2 && (() => {
                        const a = drafts.find((x) => x._id === compareIds[0])
                        const b = drafts.find((x) => x._id === compareIds[1])
                        if (!a || !b) return null
                        const sa = draftSummary(a)
                        const sb = draftSummary(b)
                        const rows = [
                          ['Transport', sa.transport, sb.transport],
                          ['Hotel', sa.hotel, sb.hotel],
                          ['Food', sa.food, sb.food],
                          ['Activities', sa.activities, sb.activities],
                        ]
                        return (
                          <div className="card" style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Comparing 2 drafts</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.875rem' }}>
                              <span></span>
                              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                              {rows.map(([label, va, vb]) => (
                                <Fragment key={label}>
                                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                                  <span>{va}</span>
                                  <span>{vb}</span>
                                </Fragment>
                              ))}
                              <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>Total</span>
                              <span style={{ fontWeight: 800, borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', color: sa.total <= sb.total ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>{inr(sa.total)}</span>
                              <span style={{ fontWeight: 800, borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', color: sb.total < sa.total ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>{inr(sb.total)}</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                              {sa.total === sb.total
                                ? 'Both drafts cost the same.'
                                : `"${sa.total < sb.total ? a.name : b.name}" is cheaper by ${inr(Math.abs(sa.total - sb.total))}.`}
                            </p>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Save-draft modal */}
      <Modal isOpen={saveDraftOpen} onClose={() => setSaveDraftOpen(false)} title="Save draft" size="sm">
        <form onSubmit={confirmSaveDraft} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input label="Draft name" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Budget option" autoFocus />
          <Button type="submit" loading={savingDraft} style={{ alignSelf: 'flex-start' }}>Save draft</Button>
        </form>
      </Modal>
    </div>
  )
}
