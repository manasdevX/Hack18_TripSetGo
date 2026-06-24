 // src/pages/Dashboard/Planner.jsx
import { useState, useEffect, Fragment, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, RotateCcw, DollarSign, Train, Hotel, Utensils,
  CalendarDays, Lightbulb, RefreshCw, Lock, Unlock, Layers, Save,
  Trash2, Download, Backpack, Plus, MapPin, Navigation, Clock,
  Users, TrendingUp, Zap, Star, ChevronRight, Plane, Bus,
  Sun, Moon, Sunrise, Cloud, Package, AlertTriangle
} from 'lucide-react'
import api from '@/services/api'
import {
  selectPlanner, selectPlan, selectPlannerForm, selectPlannerLoading,
  selectLiveBudget, selectBudgetStatus,
  updateForm, generatePlan, resetPlan, selectTransport, selectHotel, selectFood,
  setActiveDay, toggleDayLock, toggleActivity, regenerateDay,
  setActiveTab, fetchDrafts, saveDraft, loadDraft, deleteDraft
} from '@/features/planner/plannerSlice'
import BudgetBar from './components/Planner/BudgetBar'
import TripForm from './components/Planner/TripForm'
import TripAssistant from './components/Planner/TripAssistant'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Loader from '@/components/common/Loader'
import Modal from '@/components/common/Modal'

/* ─── Tailwind Utility Classes ─── */
const plannerGlassPanelClass = 'bg-[rgba(26,31,47,0.7)] backdrop-blur-[40px] border border-solid border-[rgba(255,255,255,0.08)] border-t-[rgba(255,255,255,0.12)] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]'
const plannerSectionHeaderClass = 'flex items-center gap-2 mb-4 pb-2.5 border-b border-solid border-[rgba(255,255,255,0.05)] text-[0.72rem] font-bold uppercase tracking-wider font-sans'
const plannerSectionNumClass = 'px-2 py-0.5 rounded-[5px] text-[0.7rem] font-extrabold tracking-wider'
const plannerInputGroupClass = 'relative flex flex-col gap-1.5 w-full [&>label]:block [&>label]:text-[0.75rem] [&>label]:font-medium [&>label]:text-text-secondary [&>label]:mb-1.5 [&>label]:font-sans'
const plannerInputClass = 'w-full bg-[rgba(255,255,255,0.04)] border border-solid border-[rgba(255,255,255,0.1)] rounded-lg text-text-primary font-sans text-sm py-2.5 pl-9 pr-3.5 outline-none transition-all duration-200 color-scheme-dark placeholder:text-text-muted focus:border-[rgba(14,165,233,0.5)] focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]'
const plannerInputIconClass = 'absolute left-3 top-1/2 -translate-y-1/2 text-text-muted flex items-center'
const plannerChipLabelClass = 'text-[0.75rem] font-medium text-text-muted mb-2 font-sans'
const plannerChipClass = (active, isSecondary) =>
  `px-3.5 py-1.5 rounded-full text-[0.78rem] font-semibold border border-solid text-text-muted cursor-pointer transition-all duration-200 font-sans ` +
  (active
    ? isSecondary
      ? 'bg-[rgba(20,184,166,0.15)] border-[rgba(20,184,166,0.5)] text-[#14B8A6] shadow-[0_0_10px_rgba(20,184,166,0.15)]'
      : 'bg-[rgba(14,165,233,0.15)] border-[rgba(14,165,233,0.5)] text-[#0EA5E9] shadow-[0_0_10px_rgba(14,165,233,0.15)]'
    : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:text-text-primary')

const plannerPrefChipClass = (active) =>
  `p-1.5 rounded-lg text-[0.75rem] font-semibold border border-solid text-text-muted cursor-pointer transition-all duration-200 text-center font-sans ` +
  (active
    ? 'bg-gradient-to-r from-[rgba(14,165,233,0.18)] to-[rgba(139,92,246,0.18)] border-[rgba(14,165,233,0.4)] text-[#4ae6f0] shadow-[0_0_10px_rgba(14,165,233,0.1)]'
    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:bg-[rgba(139,92,246,0.08)] hover:border-[rgba(139,92,246,0.3)] hover:text-text-primary hover:-translate-y-px')

const plannerGenerateBtnClass = 'w-full py-3.5 px-6 bg-gradient-to-r from-primary via-secondary to-accent bg-[length:200%_auto] border-none rounded-xl text-white font-bold text-[0.95rem] font-[\'Plus_Jakarta_Sans\',sans-serif] cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-300 shadow-[0_4px_20px_rgba(14,165,233,0.3)] tracking-wider hover:not-disabled:bg-right hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_28px_rgba(14,165,233,0.4)] active:not-disabled:translate-y-0 disabled:opacity-65 disabled:cursor-not-allowed'

const planTabBtnClass = (active) =>
  `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[0.8rem] font-semibold border border-solid cursor-pointer transition-all duration-200 font-sans whitespace-nowrap ` +
  (active
    ? 'bg-gradient-to-r from-primary to-secondary border-transparent text-white shadow-[0_2px_10px_rgba(14,165,233,0.3)]'
    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-text-muted hover:bg-[rgba(255,255,255,0.07)] hover:text-text-primary')

const planOptionCardClass = (selected) =>
  `border border-solid rounded-[14px] p-5 cursor-pointer transition-all duration-250 relative overflow-hidden ` +
  (selected
    ? 'border-[rgba(14,165,233,0.5)] bg-[rgba(14,165,233,0.07)] shadow-[0_0_20px_rgba(14,165,233,0.15),0_8px_24px_rgba(0,0,0,0.3)] after:content-[\'\'] after:absolute after:inset-0 after:bg-gradient-to-r after:from-[rgba(14,165,233,0.04)] after:to-transparent after:pointer-events-none'
    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-[rgba(255,255,255,0.05)]')

const daySlotCardClass = (selected) =>
  `border border-solid rounded-xl p-4 cursor-pointer transition-all duration-200 ` +
  (selected
    ? 'border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.07)]'
    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.05)]')

/* ─── Data constants ─── */
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

// Components extracted to ./components/Planner

/* ─── Transport Icon helper ─── */
function TransportIcon({ mode }) {
  const m = (mode || '').toLowerCase()
  if (m.includes('flight') || m.includes('air') || m.includes('plane')) return <Plane size={20} />
  if (m.includes('train') || m.includes('rail')) return <Train size={20} />
  if (m.includes('bus') || m.includes('road')) return <Bus size={20} />
  return <Navigation size={20} />
}

/* ─── Main Planner Component ─── */
export default function Planner() {
  const dispatch   = useDispatch()
  const plan       = useSelector(selectPlan)
  const form       = useSelector(selectPlannerForm)
  const loading    = useSelector(selectPlannerLoading)
  const liveBudget = useSelector(selectLiveBudget)
  const status     = useSelector(selectBudgetStatus)
  const { selections, activeDay, activeTab, lockedDays, regeneratingDay, tripId, drafts, draftsLoading, savingDraft } = useSelector(selectPlanner)
  const error      = useSelector(s => s.planner.error)

  const [compareIds, setCompareIds]     = useState([])
  const [saveDraftOpen, setSaveDraftOpen] = useState(false)
  const [draftName, setDraftName]         = useState('')

  useEffect(() => {
    if (activeTab === 'drafts' && tripId) dispatch(fetchDrafts(tripId))
  }, [activeTab, tripId, dispatch])

  const handleFormChange = (updates) => dispatch(updateForm(updates))
  const handleSubmit = async (e) => { e.preventDefault(); await dispatch(generatePlan(form)) }

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
        tripId, name: draftName.trim() || `Draft ${drafts.length + 1}`,
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
      setCompareIds(prev => prev.filter(x => x !== id))
    } catch (err) {
      toast('error', typeof err === 'string' ? err : 'Failed to delete draft')
    }
  }

  const toggleCompare = (id) => setCompareIds(prev => {
    if (prev.includes(id)) return prev.filter(x => x !== id)
    if (prev.length >= 2) return [prev[1], id]
    return [...prev, id]
  })

  const tabs = [
    { id: 'transport',   label: 'Transport',  icon: <Train size={14} /> },
    { id: 'hotels',      label: 'Hotels',     icon: <Hotel size={14} /> },
    { id: 'food',        label: 'Food',       icon: <Utensils size={14} /> },
    { id: 'itinerary',   label: 'Itinerary',  icon: <CalendarDays size={14} /> },
    { id: 'essentials',  label: 'Essentials', icon: <Backpack size={14} /> },
    { id: 'suggestions', label: 'AI Tips',    icon: <Lightbulb size={14} /> },
    { id: 'drafts',      label: 'Drafts',     icon: <Layers size={14} /> },
  ]

  return (
    <div className="page-enter">


      {/* Page header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}>
            AI Trip <span className="bg-gradient-primary bg-clip-text text-transparent">Planner</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Describe your dream trip — Gemini crafts your perfect itinerary
          </p>
        </div>
        {plan && (
          <button
            onClick={() => dispatch(resetPlan())}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: 'var(--color-text-secondary)',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)'; e.currentTarget.style.color = '#0EA5E9' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <RotateCcw size={14} /> New Plan
          </button>
        )}
      </div>

      {/* Error */}
      {error && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: '0.875rem 1.25rem',
          marginBottom: '1.5rem', color: '#f87171',
          fontSize: '0.875rem',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Loader text="Gemini AI is crafting your perfect trip..." />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STATE 1: Form + Assistant ── */}
        {!plan && !loading ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: '1.5rem',
              alignItems: 'stretch',
            }}
          >
            <TripForm form={form} onSubmit={handleSubmit} onChange={handleFormChange} loading={loading} />
            <TripAssistant />
          </motion.div>
        ) : plan ? (
          /* ── STATE 2: Generated Plan ── */
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Budget Tracker */}
            <BudgetBar liveBudget={liveBudget} totalBudget={Number(form.budget)} status={status} />

            {/* Trip Meta */}
            <div className={plannerGlassPanelClass} style={{
              padding: '1rem 1.5rem', borderRadius: 14,
              marginBottom: '1.5rem',
              display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center',
            }}>
              {[
                { label: 'DESTINATION', value: plan.meta?.destination, icon: <MapPin size={14} style={{ color: '#0EA5E9' }} /> },
                { label: 'DURATION', value: plan.meta?.total_days ? `${plan.meta.total_days} days` : null, icon: <Clock size={14} style={{ color: '#14B8A6' }} /> },
                { label: 'THEME', value: plan.meta?.theme, icon: <Sparkles size={14} style={{ color: '#8B5CF6' }} /> },
                { label: 'TRAVELERS', value: `${form.numTravelers} ${form.groupType}`, icon: <Users size={14} style={{ color: '#f59e0b' }} /> },
              ].map(({ label, value, icon }) => value ? (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {icon}
                  <div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize', marginTop: 1 }}>{value}</p>
                  </div>
                </div>
              ) : null)}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => dispatch(setActiveTab(t.id))}
                  className={planTabBtnClass(activeTab === t.id)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {/* Transport */}
              {activeTab === 'transport' && plan.transport_options && (
                <motion.div key="transport" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {plan.transport_options.map((t, i) => {
                      const selected = selections.transport?.mode === t.mode
                      return (
                        <div key={i} onClick={() => dispatch(selectTransport(t))}
                          className={planOptionCardClass(selected)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 10,
                              background: selected ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: selected ? '#0EA5E9' : 'var(--color-text-muted)',
                            }}>
                              <TransportIcon mode={t.mode} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {t.recommended && (
                                <span style={{
                                  padding: '0.2rem 0.5rem', borderRadius: 99,
                                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                                  color: '#34d399', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
                                }}>✓ RECOMMENDED</span>
                              )}
                              {selected && (
                                <span style={{
                                  padding: '0.2rem 0.5rem', borderRadius: 99,
                                  background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)',
                                  color: '#0EA5E9', fontSize: '0.65rem', fontWeight: 700,
                                }}>SELECTED</span>
                              )}
                            </div>
                          </div>
                          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.375rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t.mode}</p>
                          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: selected ? '#0EA5E9' : '#4ae6f0', marginBottom: '0.25rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {inr(t.total_cost)}
                          </p>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                            {inr(t.cost_per_person)} per person
                            {t.comfort && <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)' }}>· {t.comfort}</span>}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Hotels */}
              {activeTab === 'hotels' && plan.hotel_options && (
                <motion.div key="hotels" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {plan.hotel_options.map((h, i) => {
                      const selected = selections.hotel?.name === h.name
                      return (
                        <div key={i} onClick={() => dispatch(selectHotel(h))}
                          className={`plan-option-card ${selected ? 'plan-option-card-selected' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 10,
                              background: selected ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: selected ? '#14B8A6' : 'var(--color-text-muted)',
                            }}>
                              <Hotel size={20} />
                            </div>
                            {selected && (
                              <span style={{
                                padding: '0.2rem 0.5rem', borderRadius: 99,
                                background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
                                color: '#14B8A6', fontSize: '0.65rem', fontWeight: 700,
                              }}>SELECTED</span>
                            )}
                          </div>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h.name}</p>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>{h.tier}</span>
                            {h.rating && <><span>·</span><span>⭐ {h.rating}</span></>}
                          </p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: selected ? '#14B8A6' : '#37dae4', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {inr(h.price_per_night)}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>/night</span>
                          </p>
                          {h.amenities && (
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: '0.5rem' }}>
                              {Array.isArray(h.amenities) ? h.amenities.slice(0, 3).join(' · ') : h.amenities}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Food */}
              {activeTab === 'food' && plan.food_plans && (
                <motion.div key="food" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {plan.food_plans.map((f, i) => {
                      const selected = selections.food?.name === f.name
                      return (
                        <div key={i} onClick={() => dispatch(selectFood(f))}
                          className={`plan-option-card ${selected ? 'plan-option-card-selected' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 10,
                              background: selected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: selected ? '#f59e0b' : 'var(--color-text-muted)',
                            }}>
                              <Utensils size={20} />
                            </div>
                            {selected && (
                              <span style={{
                                padding: '0.2rem 0.5rem', borderRadius: 99,
                                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                                color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700,
                              }}>SELECTED</span>
                            )}
                          </div>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{f.name}</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: selected ? '#f59e0b' : '#ffc989', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {inr(f.total_cost)}
                          </p>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{inr(f.cost_per_day)}/day</p>
                          {f.highlights && (
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                              {Array.isArray(f.highlights) ? f.highlights.slice(0, 2).join(', ') : f.highlights}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Itinerary */}
              {activeTab === 'itinerary' && plan.itinerary && (
                <motion.div key="itinerary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Day selector */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    {plan.itinerary.map((day, i) => (
                      <button key={i}
                        onClick={() => dispatch(setActiveDay(i))}
                        className={planTabBtnClass(activeDay === i)}
                      >
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
                        {/* Day toolbar */}
                        <div className={plannerGlassPanelClass} style={{ padding: '1rem 1.25rem', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            {day.theme && <p style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{day.theme}</p>}
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                              Day {day.day}{isLocked ? ' · 🔒 Locked' : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => dispatch(toggleDayLock(activeDay))}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.4rem 0.875rem',
                                background: isLocked ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isLocked ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                                color: isLocked ? '#0EA5E9' : 'var(--color-text-secondary)',
                                cursor: 'pointer', transition: 'all 0.2s',
                              }}
                            >
                              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                              {isLocked ? 'Locked' : 'Lock'}
                            </button>
                            <button
                              onClick={handleRegenerate}
                              disabled={isLocked || isRegen}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.4rem 0.875rem',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                                color: 'var(--color-text-secondary)',
                                cursor: isLocked || isRegen ? 'not-allowed' : 'pointer',
                                opacity: isLocked || isRegen ? 0.5 : 1,
                                transition: 'all 0.2s',
                              }}
                            >
                              <RefreshCw size={13} style={{ animation: isRegen ? 'spin 1s linear infinite' : 'none' }} />
                              {isRegen ? 'Regenerating…' : 'Regenerate'}
                            </button>
                          </div>
                        </div>

                        {/* Activities grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: isRegen ? 0.5 : 1, pointerEvents: isRegen ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                          {['morning', 'afternoon', 'evening'].map(slot => (
                            day[slot]?.activities && (
                              <div key={slot} className={plannerGlassPanelClass} style={{ borderRadius: 14, padding: '1.25rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                                  {slot === 'morning' ? <Sunrise size={16} style={{ color: '#f59e0b' }} /> : slot === 'afternoon' ? <Sun size={16} style={{ color: '#fbbf24' }} /> : <Moon size={16} style={{ color: '#8B5CF6' }} />}
                                  {slot}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                  {day[slot].activities.map((act, j) => {
                                    const isSelected = selections.activities.some(a => a.day === activeDay && a.slot === slot && a.activity.name === act.name)
                                    return (
                                      <div key={j}
                                        onClick={() => dispatch(toggleActivity({ day: activeDay, slot, activity: act }))}
                                        className={daySlotCardClass(isSelected)}
                                      >
                                        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>{act.name}</p>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                          {act.duration} · {inr(act.cost || 0)}
                                        </p>
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

              {/* Essentials */}
              {activeTab === 'essentials' && (
                <motion.div key="essentials" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {plan.weather && (
                    <div className={plannerGlassPanelClass} style={{ borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ fontSize: 40 }}>🌤️</div>
                      <div>
                        <p style={{ fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          Weather {plan.weather.temp_range && <span style={{ color: '#0EA5E9' }}>· {plan.weather.temp_range}</span>}
                        </p>
                        {plan.weather.note && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{plan.weather.note}</p>}
                        {plan.weather.best_season && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Best season: {plan.weather.best_season}</p>}
                      </div>
                    </div>
                  )}
                  {plan.packing_list?.length > 0 ? (
                    <div className={plannerGlassPanelClass} style={{ borderRadius: 14, padding: '1.25rem' }}>
                      <p style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        <Package size={16} style={{ color: '#0EA5E9' }} /> Packing List
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.5rem' }}>
                        {plan.packing_list.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            <span style={{ color: '#14B8A6', flexShrink: 0 }}>✓</span> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : !plan.weather && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      No weather or packing details for this plan.
                    </div>
                  )}
                </motion.div>
              )}

              {/* AI Tips */}
              {activeTab === 'suggestions' && plan.ai_suggestions && (
                <motion.div key="suggestions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {plan.ai_suggestions.map((s, i) => (
                      <div key={i} className={plannerGlassPanelClass} style={{ borderRadius: 14, padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                          background: 'rgba(139,92,246,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>
                          {s.icon || '💡'}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: '0.375rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.title}</p>
                          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Drafts */}
              {activeTab === 'drafts' && (
                <motion.div key="drafts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Save panel */}
                  <div className={plannerGlassPanelClass} style={{ padding: '1.125rem 1.5rem', borderRadius: 14, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Save current version as draft</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                        Current total {inr(liveBudget)} · save different combos, then compare side by side
                      </p>
                    </div>
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1.125rem',
                        background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)',
                        border: 'none', borderRadius: 10,
                        color: 'white', fontSize: '0.82rem', fontWeight: 700,
                        cursor: savingDraft ? 'not-allowed' : 'pointer',
                        opacity: savingDraft ? 0.6 : 1,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 10px rgba(14,165,233,0.3)',
                      }}
                    >
                      <Save size={14} /> {savingDraft ? 'Saving…' : 'Save Draft'}
                    </button>
                  </div>

                  {draftsLoading ? <Loader text="Loading drafts..." /> : drafts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                      <Layers size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
                      <p style={{ fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No saved drafts yet</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.375rem', maxWidth: 320, margin: '0.375rem auto 0' }}>
                        Save a version above, tweak your picks, then compare two side by side.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                        {drafts.map(d => {
                          const s = draftSummary(d)
                          const checked = compareIds.includes(d._id)
                          return (
                            <div key={d._id} className={plannerGlassPanelClass} style={{ borderRadius: 14, padding: '1.25rem', borderColor: checked ? 'rgba(14,165,233,0.4)' : undefined }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                                <p style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.name}</p>
                                <span style={{ fontWeight: 800, color: '#0EA5E9', flexShrink: 0, marginLeft: '0.5rem' }}>{inr(s.total)}</span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1rem' }}>
                                <span>🚆 {s.transport}</span>
                                <span>🏨 {s.hotel}</span>
                                <span>🍽️ {s.food}</span>
                                <span>📍 {s.activities} activit{s.activities === 1 ? 'y' : 'ies'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                                <button onClick={() => handleLoadDraft(d)} style={{
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.3rem 0.75rem',
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 8, color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                }}>
                                  <Download size={12} /> Load
                                </button>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--color-text-muted)', marginBottom: 0 }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleCompare(d._id)} /> Compare
                                </label>
                                <button onClick={() => handleDeleteDraft(d._id)} style={{
                                  marginLeft: 'auto', padding: '0.3rem',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
                                  transition: 'color 0.2s',
                                }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Compare view */}
                      {compareIds.length === 2 && (() => {
                        const a = drafts.find(d => d._id === compareIds[0])
                        const b = drafts.find(d => d._id === compareIds[1])
                        if (!a || !b) return null
                        const sa = draftSummary(a), sb = draftSummary(b)
                        const rows = [
                          ['Transport', sa.transport, sb.transport],
                          ['Hotel', sa.hotel, sb.hotel],
                          ['Food', sa.food, sb.food],
                          ['Activities', sa.activities, sb.activities],
                        ]
                        return (
                          <div className={plannerGlassPanelClass} style={{ borderRadius: 14, padding: '1.5rem', marginTop: '1.5rem' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Layers size={16} style={{ color: '#0EA5E9' }} /> Draft Comparison
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.875rem' }}>
                              <span></span>
                              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', color: '#0EA5E9' }}>{a.name}</span>
                              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', color: '#14B8A6' }}>{b.name}</span>
                              {rows.map(([label, va, vb]) => (
                                <Fragment key={label}>
                                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                                  <span>{va}</span>
                                  <span>{vb}</span>
                                </Fragment>
                              ))}
                              <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>Total</span>
                              <span style={{ fontWeight: 800, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', color: sa.total <= sb.total ? '#14B8A6' : 'var(--color-text-primary)' }}>{inr(sa.total)}</span>
                              <span style={{ fontWeight: 800, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', color: sb.total < sa.total ? '#14B8A6' : 'var(--color-text-primary)' }}>{inr(sb.total)}</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.875rem' }}>
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
        <form onSubmit={confirmSaveDraft} className="flex flex-col gap-5">
          <Input label="Draft name" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g. Budget option" autoFocus />
          <Button type="submit" loading={savingDraft} className="self-start">Save draft</Button>
        </form>
      </Modal>
    </div>
  )
}
