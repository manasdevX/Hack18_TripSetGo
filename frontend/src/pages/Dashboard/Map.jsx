// src/pages/Dashboard/Map.jsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMapbox } from '@/hooks/useMapbox'
import MapContainer from '@/components/map/MapContainer'
import MapMarker from '@/components/map/MapMarker'
import MapPopup from '@/components/map/MapPopup'
import RouteLayer from '@/components/map/RouteLayer'
import api from '@/services/api'

const LAYER_DEFAULTS = { Hotel: false, Restaurant: false, Attraction: false }

const DEFAULT_IMAGES = {
  Hotel: 'https://placehold.co/400x400/111827/94a3b8?text=Hotel',
  Restaurant: 'https://placehold.co/400x400/111827/94a3b8?text=Restaurant',
  Attraction: 'https://placehold.co/400x400/111827/94a3b8?text=Attraction'
}

// ── Normalise live API responses to the marker format ─────────────────────────
// The live endpoints return: { coordinates: { lat, lon }, name, ... }
// The map markers expect: { location: { coordinates: [lng, lat] }, _entityType, _id, name, ... }

function normaliseHotel(h, idx) {
  if (!h?.coordinates?.lat || !h?.coordinates?.lon) return null
  return {
    _id: h.fsqId || h.id || `hotel-${idx}`,
    _entityType: 'Hotel',
    name: h.name || 'Unknown Hotel',
    location: { type: 'Point', coordinates: [h.coordinates.lon, h.coordinates.lat] },
    address: h.address || '',
    city: h.city || '',
    averageRating: h.rating ?? 0,
    image: h.image || h.photos?.[0] || DEFAULT_IMAGES.Hotel,
    priceInfo: h.priceInfo || null,
    isOpenNow: h.isOpenNow ?? null,
    distanceLabel: h.distanceLabel || null,
    category: h.category || 'Hotel',
  }
}

function normaliseRestaurant(r, idx) {
  if (!r?.coordinates?.lat || !r?.coordinates?.lon) return null
  return {
    _id: r.fsqId || r.id || `restaurant-${idx}`,
    _entityType: 'Restaurant',
    name: r.name || 'Unknown Restaurant',
    location: { type: 'Point', coordinates: [r.coordinates.lon, r.coordinates.lat] },
    address: r.address || '',
    city: r.city || '',
    averageRating: r.rating ?? r.averageRating ?? 0,
    image: r.image || r.photo || r.photos?.[0] || DEFAULT_IMAGES.Restaurant,
    cuisines: r.cuisines || [],
    priceInfo: r.priceInfo || null,
    isOpenNow: r.isOpenNow ?? r.isOpen ?? null,
    distanceLabel: r.distanceLabel || null,
    category: r.category || 'Restaurant',
  }
}

function normaliseAttraction(a, idx) {
  if (!a?.coordinates?.lat || !a?.coordinates?.lon) return null
  return {
    _id: a.xid || a.id || `attraction-${idx}`,
    _entityType: 'Attraction',
    name: a.name || 'Unknown Attraction',
    location: { type: 'Point', coordinates: [a.coordinates.lon, a.coordinates.lat] },
    address: a.address || '',
    city: a.city || '',
    averageRating: a.rating ?? 0,
    image: a.image || a.images?.[0] || DEFAULT_IMAGES.Attraction,
    category: a.category || 'Attraction',
    popularityScore: a.popularityScore ?? null,
  }
}

export default function MapPage() {
  const { mapRef, mapContainerRef, map, userLocation, setUserLocation, mapLoaded, requestLocation, mapError } = useMapbox({
    style: 'mapbox://styles/mapbox/streets-v12',
    zoom: 4,
  })

  const [entities, setEntities]             = useState({ hotels: [], restaurants: [], attractions: [] })
  const [activeLayers, setActiveLayers]     = useState(LAYER_DEFAULTS)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [loading, setLoading]               = useState(false)
  const [errors, setErrors]                 = useState({ hotels: null, restaurants: null, attractions: null })
  const [radius, setRadius]                 = useState(20)
  const [activeTab, setActiveTab]           = useState('Hotel')

  const [searchQuery, setSearchQuery]       = useState('')
  const [searchingCity, setSearchingCity]   = useState(false)
  const [searchError, setSearchError]       = useState(null)


  const handleSearchCity = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchingCity(true)
    setSearchError(null)
    try {
      const res = await api.get('/api/v1/travel/attractions/geocode', {
        params: { q: searchQuery.trim() }
      })
      if (res.data?.success && res.data?.data) {
        const { lat, lon } = res.data.data
        setUserLocation([lon, lat])
        if (map) {
          map.flyTo({ center: [lon, lat], zoom: 13, speed: 1.5 })
        }
      } else {
        setSearchError('City not found')
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Could not find city')
    } finally {
      setSearchingCity(false)
    }
  }

  // Fetch nearby entities on-demand only for active layers when location, radius, or layers change
  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (!userLocation) {
      setEntities({ hotels: [], restaurants: [], attractions: [] })
      setErrors({ hotels: null, restaurants: null, attractions: null })
      return
    }

    const [lng, lat] = userLocation
    const radiusM = radius * 1000 // convert km → meters for the API
    const fetchId = ++fetchIdRef.current

    const fetchActiveEntities = async () => {
      setLoading(true)
      const promises = []

      if (activeLayers.Hotel) {
        promises.push(
          api.get(`/api/v1/hotels/nearby`, { params: { lat, lon: lng, radius: radiusM, limit: 30 } })
            .then(res => ({ type: 'hotels', success: true, data: res.data?.data?.hotels || [] }))
            .catch(err => ({ type: 'hotels', success: false, error: err.response?.data?.message || 'Hotels unavailable' }))
        )
      } else {
        setEntities(prev => ({ ...prev, hotels: [] }))
        setErrors(prev => ({ ...prev, hotels: null }))
      }

      if (activeLayers.Restaurant) {
        promises.push(
          api.get(`/api/v1/restaurants/nearby`, { params: { lat, lon: lng, radius: radiusM, limit: 30 } })
            .then(res => ({ type: 'restaurants', success: true, data: res.data?.data?.restaurants || [] }))
            .catch(err => ({ type: 'restaurants', success: false, error: err.response?.data?.message || 'Restaurants unavailable' }))
        )
      } else {
        setEntities(prev => ({ ...prev, restaurants: [] }))
        setErrors(prev => ({ ...prev, restaurants: null }))
      }

      if (activeLayers.Attraction) {
        promises.push(
          api.get(`/api/v1/attractions/nearby`, { params: { lat, lon: lng, radius: radiusM, limit: 30 } })
            .then(res => ({ type: 'attractions', success: true, data: res.data?.data?.attractions || [] }))
            .catch(err => ({ type: 'attractions', success: false, error: err.response?.data?.message || 'Attractions unavailable' }))
        )
      } else {
        setEntities(prev => ({ ...prev, attractions: [] }))
        setErrors(prev => ({ ...prev, attractions: null }))
      }

      if (promises.length === 0) {
        setLoading(false)
        return
      }

      const results = await Promise.all(promises)

      if (fetchId !== fetchIdRef.current) return // stale response

      setEntities(prev => {
        const next = { ...prev }
        results.forEach(res => {
          if (res.success) {
            if (res.type === 'hotels') next.hotels = res.data.map(normaliseHotel).filter(Boolean)
            if (res.type === 'restaurants') next.restaurants = res.data.map(normaliseRestaurant).filter(Boolean)
            if (res.type === 'attractions') next.attractions = res.data.map(normaliseAttraction).filter(Boolean)
          } else {
            if (res.type === 'hotels') next.hotels = []
            if (res.type === 'restaurants') next.restaurants = []
            if (res.type === 'attractions') next.attractions = []
          }
        })
        return next
      })

      setErrors(prev => {
        const next = { ...prev }
        results.forEach(res => {
          if (!res.success) {
            if (res.type === 'hotels') next.hotels = res.error
            if (res.type === 'restaurants') next.restaurants = res.error
            if (res.type === 'attractions') next.attractions = res.error
          } else {
            if (res.type === 'hotels') next.hotels = null
            if (res.type === 'restaurants') next.restaurants = null
            if (res.type === 'attractions') next.attractions = null
          }
        })
        return next
      })

      setLoading(false)
    }

    fetchActiveEntities()
  }, [userLocation, radius, activeLayers.Hotel, activeLayers.Restaurant, activeLayers.Attraction])

  const toggleLayer = (type) =>
    setActiveLayers(prev => ({ ...prev, [type]: !prev[type] }))

  const handleMarkerClick = useCallback((entity) => {
    setSelectedEntity(entity)
  }, [])

  const handleClosePopup = useCallback(() => setSelectedEntity(null), [])

  const focusOnEntity = useCallback((entity) => {
    setSelectedEntity(entity)
    const coords = entity.location?.coordinates
    if (coords && map) {
      map.flyTo({
        center: coords,
        zoom: 14,
        essential: true
      })
    }
  }, [map])

  const allMarkers = [
    ...(activeLayers.Hotel       ? entities.hotels      || [] : []),
    ...(activeLayers.Restaurant  ? entities.restaurants || [] : []),
    ...(activeLayers.Attraction  ? entities.attractions || [] : []),
  ]

  // Route: connect first hotel & first attraction if both exist
  const routeCoords = [
    entities.hotels?.[0]?.location?.coordinates,
    entities.attractions?.[0]?.location?.coordinates,
  ].filter(Boolean)

  const totalFound = (entities.hotels?.length || 0) + (entities.restaurants?.length || 0) + (entities.attractions?.length || 0)
  
  const activeList = activeTab === 'Hotel'
    ? entities.hotels
    : activeTab === 'Restaurant'
      ? entities.restaurants
      : entities.attractions

  return (
    <div className="flex flex-col gap-4 p-4" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Explore <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Map</span></h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Discover hotels, restaurants and attractions near you</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearchCity} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search city (e.g. London, Paris...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface border border-border rounded-xl text-text-primary font-sans text-xs px-4 py-2 px-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] w-60"
            />
            <button
              type="submit"
              disabled={searchingCity}
              className="absolute right-3 text-text-secondary hover:text-text-primary disabled:opacity-50 cursor-pointer text-sm"
            >
              {searchingCity ? '⌛' : '🔍'}
            </button>
          </form>
          <button id="btn-locate-me" onClick={requestLocation} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-primary via-secondary to-accent bg-[length:200%_auto] text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.3)] hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98]">
            📍 Locate Me
          </button>
        </div>
      </div>
      {searchError && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem', textAlign: 'right' }}>
          ⚠ {searchError}
        </div>
      )}

      {/* Map Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar Controls */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-bg-card/75 backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
          style={{ width: 224, flexShrink: 0, padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Layers</h2>

          {[
            { key: 'Hotel',      emoji: '🏨', label: 'Hotels',      color: '#818cf8', errorKey: 'hotels' },
            { key: 'Restaurant', emoji: '🍽️', label: 'Restaurants', color: '#fbbf24', errorKey: 'restaurants' },
            { key: 'Attraction', emoji: '🎯', label: 'Attractions', color: '#34d399', errorKey: 'attractions' },
          ].map(({ key, emoji, label, color, errorKey }) => {
            const active = activeLayers[key]
            const layerError = errors[errorKey]
            return (
              <div key={key}>
                <button
                  id={`toggle-${key.toLowerCase()}`}
                  onClick={() => toggleLayer(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', width: '100%',
                    border: active ? '1px solid transparent' : '1px solid var(--color-border)',
                    background: active ? color : 'transparent',
                    color: active ? '#0b1020' : 'var(--color-text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span>{emoji}</span> {label} ({entities[errorKey]?.length || 0})
                </button>
                {layerError && (
                  <p style={{ fontSize: '0.65rem', color: '#f97316', marginTop: '0.25rem', paddingLeft: '0.5rem', lineHeight: 1.3 }}>
                    ⚠ {layerError}
                  </p>
                )}
              </div>
            )
          })}

          <div className="h-px bg-border my-6" style={{ margin: 0 }} />

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Radius: {radius} km</label>
            <input
              id="range-radius"
              type="range" min="5" max="50" step="5"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full mt-1"
              style={{ accentColor: 'var(--color-accent-primary)' }}
            />
          </div>

          {loading && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <div className="animate-spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--color-accent-primary)', borderRadius: '50%' }} />
              <span>Searching...</span>
            </div>
          )}
        </motion.aside>

        {/* Map */}
        <div className="flex-1 min-h-0 flex flex-col relative" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          {mapError && (
            <div className="absolute inset-0 bg-red-950/20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 gap-2">
              <span className="text-2xl">⚠</span>
              <p className="text-xs font-bold text-red-400">{mapError}</p>
              <p className="text-[10px] text-text-muted">Please check your internet connection or browser settings.</p>
            </div>
          )}
          <MapContainer ref={mapContainerRef} className="h-full w-full">

            {/* Entity markers */}
            {map && mapLoaded && allMarkers.map((entity) => {
              const [lng, lat] = entity.location?.coordinates || []
              if (!lng || !lat) return null
              return (
                <MapMarker
                  key={entity._id}
                  map={map}
                  coordinates={[lng, lat]}
                  type={entity._entityType}
                  data={entity}
                  onClick={handleMarkerClick}
                />
              )
            })}

            {/* User location marker */}
            {map && mapLoaded && userLocation && (
              <MapMarker
                map={map}
                coordinates={userLocation}
                type="User"
                data={{ name: 'You are here', _entityType: 'User' }}
                onClick={() => {}}
              />
            )}

            {map && mapLoaded && selectedEntity && (
              <MapPopup
                map={map}
                entity={selectedEntity}
                onClose={handleClosePopup}
              />
            )}

            {/* Route line between first hotel and first attraction */}
            {routeCoords.length >= 2 && (
              <RouteLayer
                mapRef={mapRef}
                mapLoaded={mapLoaded}
                coordinates={routeCoords}
                color="#6366f1"
              />
            )}

          </MapContainer>
        </div>

        {/* Results Side Panel */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-bg-card/75 backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] flex flex-col min-h-0"
          style={{ width: 340, flexShrink: 0, padding: '1rem', borderRadius: 'var(--radius-lg)' }}
        >
          <div className="flex flex-col gap-2 mb-3">
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Places Nearby</h2>
            <div className="flex border-b border-border text-xs gap-1 mt-1">
              <button
                onClick={() => setActiveTab('Hotel')}
                className={`flex-1 pb-2 font-semibold transition-colors cursor-pointer text-center ${activeTab === 'Hotel' ? 'border-b-2 border-indigo-400 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                🏨 Hotels ({entities.hotels?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('Restaurant')}
                className={`flex-1 pb-2 font-semibold transition-colors cursor-pointer text-center ${activeTab === 'Restaurant' ? 'border-b-2 border-amber-400 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                🍽️ Food ({entities.restaurants?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('Attraction')}
                className={`flex-1 pb-2 font-semibold transition-colors cursor-pointer text-center ${activeTab === 'Attraction' ? 'border-b-2 border-emerald-400 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                🎯 Sights ({entities.attractions?.length || 0})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 custom-scrollbar">
            {activeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted gap-2">
                <span className="text-2xl">🔍</span>
                <p className="text-xs">No {activeTab.toLowerCase()}s found nearby.</p>
                <p className="text-[10px] text-text-muted/60">Try increasing the radius or panning the map.</p>
              </div>
            ) : (
              activeList.map((item) => {
                const isSelected = selectedEntity?._id === item._id
                return (
                  <div
                    key={item._id}
                    onClick={() => focusOnEntity(item)}
                    className={`flex gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'border-border/40 hover:border-border hover:bg-white/5'}`}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMAGES[item._entityType];
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 text-xl border border-border/20">
                        {item._entityType === 'Hotel' ? '🏨' : item._entityType === 'Restaurant' ? '🍽️' : '🎯'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-bold text-xs text-text-primary truncate" style={{ margin: 0 }}>{item.name}</h3>
                        <p className="text-[10px] text-text-muted truncate mt-0.5" style={{ margin: 0 }}>
                          {item.category && item.category !== item._entityType ? item.category : item._entityType}
                          {item.distanceLabel ? ` • ${item.distanceLabel}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {item.averageRating > 0 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-400 gap-0.5">
                            ★ {item.averageRating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-muted/40">No reviews</span>
                        )}
                        {item.isOpenNow !== null && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.isOpenNow ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {item.isOpenNow ? 'Open' : 'Closed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  )
}