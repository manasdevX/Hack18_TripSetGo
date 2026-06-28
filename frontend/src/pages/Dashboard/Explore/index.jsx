import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, CloudRain, MapPin, Utensils, Search } from 'lucide-react';
import { travelApi } from '@/services/travelApi';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';

const TABS = [
  { id: 'flights', label: 'Flights', icon: Plane, color: '#0EA5E9' },
  { id: 'weather', label: 'Weather', icon: CloudRain, color: '#F59E0B' },
  { id: 'places', label: 'Attractions', icon: MapPin, color: '#8B5CF6' },
  { id: 'dining', label: 'Dining', icon: Utensils, color: '#10B981' },
];

export default function Explore() {
  const [activeTab, setActiveTab] = useState('flights');
  
  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Explore <span className="bg-gradient-primary bg-clip-text text-transparent">Live Travel Services</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Search live flight availability, current weather, and local attractions powered by top-tier providers.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: 99,
                fontWeight: 600, fontSize: '0.9rem',
                background: isActive ? `rgba(${hexToRgb(tab.color)}, 0.15)` : 'rgba(255,255,255,0.03)',
                color: isActive ? tab.color : 'var(--color-text-secondary)',
                border: `1px solid ${isActive ? `rgba(${hexToRgb(tab.color)}, 0.4)` : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ minHeight: 400 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'flights' && <FlightsTab key="flights" />}
          {activeTab === 'weather' && <WeatherTab key="weather" />}
          {activeTab === 'places' && <PlacesTab key="places" type="attractions" />}
          {activeTab === 'dining' && <PlacesTab key="dining" type="restaurants" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Quick hex to rgb helper
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── FLIGHTS TAB ─────────────────────────────────────────────────────────────

// Static city-to-IATA lookup for instant resolution (no API calls needed)
const CITY_IATA_MAP = {
  // India
  'delhi': 'DEL', 'new delhi': 'DEL', 'mumbai': 'BOM', 'bombay': 'BOM',
  'bangalore': 'BLR', 'bengaluru': 'BLR', 'hyderabad': 'HYD',
  'chennai': 'MAA', 'madras': 'MAA', 'kolkata': 'CCU', 'calcutta': 'CCU',
  'ahmedabad': 'AMD', 'pune': 'PNQ', 'jaipur': 'JAI', 'lucknow': 'LKO',
  'goa': 'GOI', 'kochi': 'COK', 'cochin': 'COK', 'thiruvananthapuram': 'TRV',
  'trivandrum': 'TRV', 'guwahati': 'GAU', 'patna': 'PAT', 'bhopal': 'BHO',
  'indore': 'IDR', 'nagpur': 'NAG', 'varanasi': 'VNS', 'chandigarh': 'IXC',
  'coimbatore': 'CJB', 'vizag': 'VTZ', 'visakhapatnam': 'VTZ',
  'srinagar': 'SXR', 'amritsar': 'ATQ', 'ranchi': 'IXR', 'raipur': 'RPR',
  'mangalore': 'IXE', 'udaipur': 'UDR', 'dehradun': 'DED', 'imphal': 'IMF',
  'agartala': 'IXA', 'bhubaneswar': 'BBI', 'jammu': 'IXJ', 'leh': 'IXL',
  'madurai': 'IXM', 'bagdogra': 'IXB', 'darjeeling': 'IXB', 'siliguri': 'IXB',
  'port blair': 'IXZ', 'andaman': 'IXZ',
  // International
  'london': 'LHR', 'paris': 'CDG', 'new york': 'JFK', 'los angeles': 'LAX',
  'tokyo': 'NRT', 'singapore': 'SIN', 'dubai': 'DXB', 'bangkok': 'BKK',
  'hong kong': 'HKG', 'sydney': 'SYD', 'san francisco': 'SFO',
  'chicago': 'ORD', 'toronto': 'YYZ', 'kuala lumpur': 'KUL', 'seoul': 'ICN',
  'istanbul': 'IST', 'rome': 'FCO', 'amsterdam': 'AMS', 'frankfurt': 'FRA',
  'barcelona': 'BCN', 'madrid': 'MAD', 'berlin': 'BER', 'zurich': 'ZRH',
  'doha': 'DOH', 'abu dhabi': 'AUH', 'kathmandu': 'KTM', 'colombo': 'CMB',
  'dhaka': 'DAC', 'male': 'MLE', 'maldives': 'MLE', 'beijing': 'PEK',
  'shanghai': 'PVG', 'moscow': 'SVO', 'cairo': 'CAI', 'nairobi': 'NBO',
  'johannesburg': 'JNB', 'cape town': 'CPT', 'melbourne': 'MEL',
  'auckland': 'AKL', 'bali': 'DPS', 'jakarta': 'CGK', 'manila': 'MNL',
  'hanoi': 'HAN', 'ho chi minh': 'SGN', 'saigon': 'SGN',
  'taipei': 'TPE', 'osaka': 'KIX', 'lisbon': 'LIS', 'vienna': 'VIE',
  'munich': 'MUC', 'dublin': 'DUB', 'athens': 'ATH',
};

function FlightsTab() {
  const [form, setForm] = useState({ origin: '', destination: '', date: '', adults: 1, travelClass: 'ECONOMY' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [resolvedCodes, setResolvedCodes] = useState({ origin: null, destination: null });

  // Resolve a city name or IATA code to an IATA code
  const resolveToIata = async (input) => {
    const trimmed = input.trim();
    // If already a 3-letter IATA code, use it directly
    if (/^[A-Za-z]{3}$/.test(trimmed)) {
      const upper = trimmed.toUpperCase();
      // Check if it's a known city name with 3 letters (e.g., "Goa")
      const mapped = CITY_IATA_MAP[trimmed.toLowerCase()];
      if (mapped) return mapped;
      // Otherwise assume it's an IATA code
      return upper;
    }
    // Static lookup first (instant, no API quota burned)
    const mapped = CITY_IATA_MAP[trimmed.toLowerCase()];
    if (mapped) return mapped;
    // Fallback: API search for unknown cities
    try {
      const res = await travelApi.searchAirportsByCity(trimmed, 5);
      const airports = res.data?.data?.airports;
      if (airports && airports.length > 0) {
        // Find the best match — prefer major airports (with IATA code)
        const best = airports.find(a => a.iataCode && a.iataCode.length === 3) || airports[0];
        if (best?.iataCode) return best.iataCode;
      }
    } catch { /* ignore API errors, return null */ }
    return null;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination || !form.date) return;
    setLoading(true); setError(null); setResults(null); setResolvedCodes({ origin: null, destination: null });
    try {
      // Resolve city names to IATA codes
      const [depIata, arrIata] = await Promise.all([
        resolveToIata(form.origin),
        resolveToIata(form.destination),
      ]);
      if (!depIata) { setError(`Could not find an airport for "${form.origin}". Try a different city name or enter the 3-letter IATA code directly.`); setLoading(false); return; }
      if (!arrIata) { setError(`Could not find an airport for "${form.destination}". Try a different city name or enter the 3-letter IATA code directly.`); setLoading(false); return; }
      setResolvedCodes({ origin: depIata, destination: arrIata });

      const res = await travelApi.searchFlights({
        depIata,
        arrIata,
        flightDate: form.date,
        limit: 10
      });
      setResults(res.data.data.flights);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search flights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Origin</label>
          <Input placeholder="Delhi, DEL, Mumbai..." value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} required />
          {resolvedCodes.origin && <span style={{ fontSize: '0.7rem', color: 'var(--color-accent-blue)', marginTop: '0.25rem', display: 'block' }}>✓ Resolved: {resolvedCodes.origin}</span>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Destination</label>
          <Input placeholder="Hyderabad, BOM, Goa..." value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} required />
          {resolvedCodes.destination && <span style={{ fontSize: '0.7rem', color: 'var(--color-accent-blue)', marginTop: '0.25rem', display: 'block' }}>✓ Resolved: {resolvedCodes.destination}</span>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)]" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Class</label>
          <select value={form.travelClass} onChange={e => setForm({...form, travelClass: e.target.value})} className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] cursor-pointer">
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium Econ</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button type="submit" disabled={loading} style={{ width: '100%', height: 48, background: '#0EA5E9', borderColor: '#0EA5E9', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            {loading ? <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : <Search size={16} />} Search
          </Button>
        </div>
      </form>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
      
      {results && results.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No flights found. Try different dates or airports.</div>}
      
      {results && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {results.map((flight, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9', fontWeight: 800 }}>
                  ✈️
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.2rem' }}>{flight.airline?.name || 'Unknown Airline'} <span style={{fontSize:'0.8rem', color:'var(--color-text-muted)'}}>({flight.flightIata})</span></h4>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '1rem' }}>
                    <span>{flight.departureAirport?.name || flight.departureAirport?.iataCode} → {flight.arrivalAirport?.name || flight.arrivalAirport?.iataCode}</span>
                    <span>⏱ {flight.departureTime ? new Date(flight.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Scheduled'}</span>
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: flight.status === 'active' ? '#10B981' : '#0EA5E9', textTransform: 'capitalize' }}>{flight.status || 'Scheduled'}</p>
                {flight.arrivalTime && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Arrives {new Date(flight.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── WEATHER TAB ─────────────────────────────────────────────────────────────
function WeatherTab() {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city) return;
    setLoading(true); setError(null); setWeather(null);
    try {
      const current = await travelApi.getCurrentWeather(city);
      const forecast = await travelApi.getWeatherForecast(city);
      setWeather({ current: current.data.data.current, forecast: forecast.data.data.forecast });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <Input placeholder="Enter city (e.g. Goa, Mumbai)" value={city} onChange={e => setCity(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} style={{ background: '#F59E0B', borderColor: '#F59E0B', display: 'flex', gap: '0.5rem' }}>
          {loading ? <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : <Search size={16} />} Check Weather
        </Button>
      </form>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

      {weather && weather.current && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.02))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 20, padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>{weather.current.conditionIcon || '🌤️'}</span>
                {weather.current.cityName}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>{weather.current.conditionGroup} • {weather.current.conditionDesc}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '3.5rem', fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>{Math.round(weather.current.tempC)}°<span style={{ fontSize: '1.5rem', opacity: 0.6 }}>C</span></p>
              <p style={{ color: 'var(--color-text-muted)' }}>Feels like {Math.round(weather.current.feelsLikeC)}°C</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>5-Day Forecast</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            {weather.forecast?.slice(0, 5).map((day, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <div style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{day.conditionIcon || '🌤️'}</div>
                <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{Math.round(day.tempMaxC)}° <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{Math.round(day.tempMinC)}°</span></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-accent-blue)', marginTop: '0.5rem' }}>💧 {Math.round(day.rainProbability)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── PLACES TAB (Attractions & Restaurants) ──────────────────────────────────
function PlacesTab({ type }) {
  const isAttr = type === 'attractions';
  const color = isAttr ? '#8B5CF6' : '#10B981';
  
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city) return;
    setLoading(true); setError(null); setPlaces(null);
    try {
      const res = isAttr 
        ? await travelApi.searchAttractionsByCity(city) 
        : await travelApi.searchRestaurantsByCity(city);
      setPlaces(isAttr ? res.data.data.attractions : res.data.data.restaurants);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to fetch ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <Input placeholder={`Enter city to find ${type}...`} value={city} onChange={e => setCity(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} style={{ background: color, borderColor: color, display: 'flex', gap: '0.5rem' }}>
          {loading ? <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : <Search size={16} />} Find {isAttr ? 'Attractions' : 'Dining'}
        </Button>
      </form>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

      {places && places.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No {type} found in this area.</div>}

      {places && places.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {places.map((place, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 160, background: place.photo ? `url(${place.photo}) center/cover` : 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-end', padding: '1rem', position: 'relative' }}>
                {!place.photo && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', opacity: 0.5 }}><MapPin size={32} /></div>}
                {place.rating > 0 && (
                  <span style={{ background: 'rgba(0,0,0,0.7)', color: '#FCD34D', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    ★ {place.rating}
                  </span>
                )}
              </div>
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }} className="line-clamp-1" title={place.name}>{place.name}</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'capitalize' }} className="line-clamp-1">{place.category}</p>
                {place.address && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}><MapPin size={12} style={{ marginTop: 2, flexShrink: 0 }} /> <span className="line-clamp-2">{place.address}</span></p>}
                
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!isAttr && place.priceTier > 0 && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: 6, color: '#10B981', fontWeight: 600 }}>{'$'.repeat(place.priceTier)}</span>
                  )}
                  {place.isOpen !== undefined && (
                    <span style={{ fontSize: '0.75rem', background: place.isOpen ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: place.isOpen ? '#10B981' : '#EF4444', padding: '0.2rem 0.5rem', borderRadius: 6, fontWeight: 600 }}>{place.isOpen ? 'Open Now' : 'Closed'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
