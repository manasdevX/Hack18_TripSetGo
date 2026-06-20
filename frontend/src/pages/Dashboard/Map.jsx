// src/pages/Dashboard/Map.jsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMapbox } from '@/hooks/useMapbox'
import MapContainer from '@/components/map/MapContainer'
import MapMarker from '@/components/map/MapMarker'
import MapPopup from '@/components/map/MapPopup'
import RouteLayer from '@/components/map/RouteLayer'
import api from '@/services/api'

const LAYER_DEFAULTS = { Hotel: true, Restaurant: true, Attraction: true }

export default function MapPage() {
  // `map` is a React state value — safe to read in JSX
  const { mapRef, mapContainerRef, map, userLocation, mapLoaded, requestLocation } = useMapbox({
    style: 'mapbox://styles/mapbox/streets-v12',
    zoom: 4,
  })

  const [entities, setEntities]             = useState({ hotels: [], restaurants: [], attractions: [] })
  const [activeLayers, setActiveLayers]     = useState(LAYER_DEFAULTS)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [loading, setLoading]               = useState(false)
  const [radius, setRadius]                 = useState(20)

  // Fetch nearby entities when user location or radius changes
  // Using a ref to avoid stale closure issues, setLoading moved outside the effect condition
  const abortRef = useRef(null)

  useEffect(() => {
    if (!userLocation) return

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    const [lng, lat] = userLocation
    let cancelled = false

    const fetchNearby = async () => {
      setLoading(true)
      try {
        const { data } = await api.get(
          `/api/v1/search/nearby?lng=${lng}&lat=${lat}&radius=${radius}&type=all&limit=30`
        )
        if (!cancelled && data.success) setEntities(data.data)
      } catch (err) {
        if (!cancelled) console.error('Nearby fetch failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNearby()

    return () => { cancelled = true }
  }, [userLocation, radius])

  const toggleLayer = (type) =>
    setActiveLayers(prev => ({ ...prev, [type]: !prev[type] }))

  const handleMarkerClick = useCallback((entity) => {
    setSelectedEntity(entity)
  }, [])

  const handleClosePopup = useCallback(() => setSelectedEntity(null), [])

  const allMarkers = [
    ...(activeLayers.Hotel       ? entities.hotels      || [] : []),
    ...(activeLayers.Restaurant  ? entities.restaurants || [] : []),
    ...(activeLayers.Attraction  ? entities.attractions || [] : []),
  ]

  // Demo route: connect first hotel → first attraction if both exist
  const routeCoords = [
    entities.hotels?.[0]?.location?.coordinates,
    entities.attractions?.[0]?.location?.coordinates,
  ].filter(Boolean)

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Explore <span className="gradient-text">Map</span></h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Discover hotels, restaurants and attractions near you</p>
        </div>
        <button id="btn-locate-me" onClick={requestLocation} className="btn btn-primary btn-sm">
          📍 Locate Me
        </button>
      </div>

      {/* Map Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar Controls */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass"
          style={{ width: 224, flexShrink: 0, padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Layers</h2>

          {[
            { key: 'Hotel',      emoji: '🏨', label: 'Hotels',      color: '#818cf8' },
            { key: 'Restaurant', emoji: '🍽️', label: 'Restaurants', color: '#fbbf24' },
            { key: 'Attraction', emoji: '🗺️', label: 'Attractions', color: '#34d399' },
          ].map(({ key, emoji, label, color }) => {
            const active = activeLayers[key]
            return (
              <button
                key={key}
                id={`toggle-${key.toLowerCase()}`}
                onClick={() => toggleLayer(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  border: active ? '1px solid transparent' : '1px solid var(--color-border)',
                  background: active ? color : 'transparent',
                  color: active ? '#0b1020' : 'var(--color-text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span>{emoji}</span> {label}
              </button>
            )
          })}

          <div className="divider" style={{ margin: 0 }} />

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Radius: {radius} km</label>
            <input
              id="range-radius"
              type="range" min="5" max="100" step="5"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full mt-1"
              style={{ accentColor: 'var(--color-accent-primary)' }}
            />
          </div>

          <div className="divider" style={{ margin: 0 }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            {loading ? '⏳ Loading...' : (
              <>
                {entities.hotels?.length || 0} Hotels<br />
                {entities.restaurants?.length || 0} Restaurants<br />
                {entities.attractions?.length || 0} Attractions
              </>
            )}
          </div>
        </motion.aside>

        {/* Map — use `map` (state) not mapRef.current, safe during render */}
        <div className="flex-1 min-h-0" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <MapContainer ref={mapContainerRef} className="h-full">

            {/* Entity markers — only rendered when map state is set */}
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
      </div>
    </div>
  )
}
