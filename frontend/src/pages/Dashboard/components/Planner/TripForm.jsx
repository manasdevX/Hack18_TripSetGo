import { useState, useEffect, useRef } from 'react'
import { Sparkles, Navigation, MapPin, Plane, CalendarDays, DollarSign, Users, ChevronRight } from 'lucide-react'

const plannerGlassPanelClass = 'bg-[rgba(26,31,47,0.7)] backdrop-blur-[40px] border border-solid border-[rgba(255,255,255,0.08)] border-t-[rgba(255,255,255,0.12)] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]'
const plannerSectionHeaderClass = 'flex items-center gap-2 mb-4 font-bold text-[0.875rem] uppercase tracking-wider'
const plannerSectionNumClass = 'flex items-center justify-center w-6 h-6 rounded-md text-[0.7rem] font-bold'
const plannerInputGroupClass = 'flex flex-col gap-[0.375rem] relative [&_label]:text-[0.75rem] [&_label]:font-semibold [&_label]:text-[var(--color-text-secondary)] [&_label]:ml-1'
const plannerInputClass = 'w-full bg-[rgba(255,255,255,0.03)] border border-solid border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 pl-10 text-[0.875rem] text-[var(--color-text-primary)] transition-all duration-200 outline-none hover:border-[rgba(255,255,255,0.15)] focus:border-[#0EA5E9] focus:bg-[rgba(14,165,233,0.03)] focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] placeholder:text-[var(--color-text-muted)]'
const plannerInputIconClass = 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none'
const plannerChipLabelClass = 'text-[0.75rem] font-semibold text-[var(--color-text-secondary)] mb-2 ml-1'
const plannerChipClass = (active) => `px-4 py-2 rounded-xl text-[0.8125rem] font-semibold transition-all duration-200 cursor-pointer border border-solid ${
  active
    ? 'bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] text-white border-transparent shadow-[0_4px_12px_rgba(14,165,233,0.3)]'
    : 'bg-[rgba(255,255,255,0.03)] text-[var(--color-text-secondary)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]'
}`
const plannerPrefChipClass = (active) => `flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.8rem] font-medium transition-all duration-200 cursor-pointer border border-solid ${
  active
    ? 'bg-[rgba(139,92,246,0.15)] text-[#c4b5fd] border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.2)]'
    : 'bg-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)] border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.25)] hover:text-[var(--color-text-primary)]'
}`
const plannerGenerateBtnClass = 'mt-6 self-end inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] text-white px-8 py-3.5 rounded-xl font-bold text-[0.95rem] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(14,165,233,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none'

const GROUP_TYPES = [
  { value: 'solo',   label: 'Solo' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'friends',label: 'Friends' },
]

const PACE_OPTIONS = [
  { value: 'relaxed',  label: 'Relaxed (1-2 places/day)' },
  { value: 'balanced', label: 'Balanced (3-4 places/day)' },
  { value: 'packed',   label: 'Packed (5+ places/day)' },
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

const POPULAR_CITIES = [
  // India
  'Delhi', 'Mumbai', 'Bengaluru', 'Goa', 'Jaipur', 'Hyderabad',
  'Srinagar', 'Kochi', 'Varanasi', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Udaipur', 'Agra', 'Amritsar', 'Dehradun', 'Shimla',
  // Asia & Middle East
  'Dubai', 'Singapore', 'Bangkok', 'Tokyo', 'Bali', 'Maldives',
  'Kuala Lumpur', 'Hong Kong', 'Kathmandu', 'Colombo',
  // Europe & Americas
  'London', 'Paris', 'New York', 'Rome', 'Amsterdam', 'Barcelona',
  'Sydney', 'Melbourne', 'Toronto', 'Los Angeles', 'San Francisco'
];

function CityAutocomplete({ value, onChange, placeholder, icon: Icon }) {
  const [query, setQuery] = useState(value || '');
  const [prevValue, setPrevValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value || '');
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = POPULAR_CITIES.filter(c =>
    c.toLowerCase().includes((query || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <Icon size={14} className={plannerInputIconClass} />
      <input
        className={plannerInputClass}
        placeholder={placeholder}
        required
        value={query}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          onChange(val);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {isOpen && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.4rem',
          background: '#0F172A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {filtered.map(c => (
            <div
              key={c}
              onMouseDown={() => {
                setQuery(c);
                onChange(c);
                setIsOpen(false);
              }}
              style={{
                padding: '0.625rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.02)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              📍 {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripForm({ form, onSubmit, onChange, loading }) {
  const [prefs, setPrefs] = useState(form.preferences || [])
  const togglePref = (p) => {
    const next = prefs.includes(p) ? prefs.filter(x => x !== p) : [...prefs, p]
    setPrefs(next)
    onChange({ preferences: next })
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (new Date(form.endDate) < new Date(form.startDate)) {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'error', message: 'End Date cannot be before Start Date' } 
      }));
      return;
    }
    onSubmit(e);
  }

  return (
    <div className={plannerGlassPanelClass} style={{
      borderRadius: 20,
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(14,165,233,0.3)',
          flexShrink: 0,
        }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 2 }}>
            AI Trip Planner
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            Gemini builds your customized roadmap in seconds
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* Section 01: Route & Timeline */}
        <div>
          <div className={plannerSectionHeaderClass} style={{ color: '#0EA5E9' }}>
            <span className={plannerSectionNumClass} style={{ background: 'rgba(14,165,233,0.12)', color: '#0EA5E9' }}>01</span>
            <Navigation size={14} style={{ opacity: 0.7 }} />
            <span>Route &amp; Timeline</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', position: 'relative', zIndex: 10 }}>
            <div className={plannerInputGroupClass}>
              <label>Departure From</label>
              <CityAutocomplete
                value={form.source}
                onChange={(val) => onChange({ source: val })}
                placeholder="Origin"
                icon={MapPin}
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {['Delhi', 'Mumbai', 'Bengaluru'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ source: c })}
                    style={{
                      fontSize: '0.7rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '99px',
                      padding: '0.15rem 0.45rem',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className={plannerInputGroupClass}>
              <label>Destination To</label>
              <CityAutocomplete
                value={form.destination}
                onChange={(val) => onChange({ destination: val })}
                placeholder="Destination"
                icon={Plane}
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {['Goa', 'Jaipur', 'Hyderabad'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ destination: c })}
                    style={{
                      fontSize: '0.7rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '99px',
                      padding: '0.15rem 0.45rem',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className={plannerInputGroupClass}>
              <label>Start Date</label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={14} className={plannerInputIconClass} />
                <input
                  type="date"
                  className={plannerInputClass}
                  required
                  value={form.startDate}
                  onChange={e => onChange({ startDate: e.target.value })}
                />
              </div>
            </div>
            <div className={plannerInputGroupClass}>
              <label>End Date</label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={14} className={plannerInputIconClass} />
                <input
                  type="date"
                  className={plannerInputClass}
                  required
                  min={form.startDate}
                  value={form.endDate}
                  onChange={e => onChange({ endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 02: Budget & Travelers */}
        <div>
          <div className={plannerSectionHeaderClass} style={{ color: '#14B8A6' }}>
            <span className={plannerSectionNumClass} style={{ background: 'rgba(20,184,166,0.12)', color: '#14B8A6' }}>02</span>
            <DollarSign size={14} style={{ opacity: 0.7 }} />
            <span>Budget &amp; Travelers</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className={plannerInputGroupClass}>
              <label>Budget Limit (₹)</label>
              <div style={{ position: 'relative' }}>
                <span className={plannerInputIconClass} style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Inter' }}>₹</span>
                <input
                  type="number"
                  className={plannerInputClass}
                  placeholder="50,000"
                  required
                  value={form.budget}
                  onChange={e => onChange({ budget: e.target.value })}
                />
              </div>
            </div>
            <div className={plannerInputGroupClass}>
              <label>Number of Travelers</label>
              <div style={{ position: 'relative' }}>
                <Users size={14} className={plannerInputIconClass} />
                <input
                  type="number"
                  className={plannerInputClass}
                  min={1}
                  max={30}
                  required
                  value={form.numTravelers}
                  onChange={e => onChange({ numTravelers: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p className={plannerChipLabelClass}>Companion Type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {GROUP_TYPES.map(g => {
                const active = form.groupType === g.value
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => onChange({ groupType: g.value })}
                    className={plannerChipClass(active)}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className={plannerChipLabelClass}>Travel Pace</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {PACE_OPTIONS.map(p => {
                const active = (form.pace || 'balanced') === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onChange({ pace: p.value })}
                    className={plannerChipClass(active)}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Section 03: Experience Preferences */}
        <div>
          <div className={plannerSectionHeaderClass} style={{ color: '#8B5CF6' }}>
            <span className={plannerSectionNumClass} style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>03</span>
            <Sparkles size={14} style={{ opacity: 0.7 }} />
            <span>Experience Preferences</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {PREFERENCES.map(p => {
              const active = prefs.includes(p.value)
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePref(p.value)}
                  className={plannerPrefChipClass(active)}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={loading}
          className={plannerGenerateBtnClass}
        >
          {loading ? (
            <span style={{
              width: 16, height: 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
            }} />
          ) : (
            <Sparkles size={18} />
          )}
          {loading ? 'Building Your Itinerary...' : 'Generate AI Itinerary'}
          {!loading && <ChevronRight size={18} />}
        </button>
      </form>
    </div>
  )
}
