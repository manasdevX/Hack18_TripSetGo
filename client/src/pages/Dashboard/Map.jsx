// client/src/pages/Dashboard/Map.jsx
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
          <h1 className="text-2xl font-bold text-slate-800">Explore Map</h1>
          <p className="text-sm text-slate-500">Discover hotels, restaurants and attractions near you</p>
        </div>
        <button
          id="btn-locate-me"
          onClick={requestLocation}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          📍 Locate Me
        </button>
      </div>

      {/* Map Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar Controls */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-56 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Layers</h2>

          {[
            { key: 'Hotel',      emoji: '🏨', label: 'Hotels',      color: 'bg-indigo-500' },
            { key: 'Restaurant', emoji: '🍽️', label: 'Restaurants', color: 'bg-amber-500'  },
            { key: 'Attraction', emoji: '🗺️', label: 'Attractions', color: 'bg-emerald-500'},
          ].map(({ key, emoji, label, color }) => (
            <button
              key={key}
              id={`toggle-${key.toLowerCase()}`}
              onClick={() => toggleLayer(key)}
              className={`flex items-center gap-3 p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                activeLayers[key]
                  ? `border-transparent ${color} text-white shadow-md`
                  : 'border-slate-200 text-slate-500 bg-white'
              }`}
            >
              <span>{emoji}</span> {label}
            </button>
          ))}

          <hr className="border-slate-100" />

          <div>
            <label className="text-xs text-slate-500 font-medium">Radius: {radius} km</label>
            <input
              id="range-radius"
              type="range" min="5" max="100" step="5"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full mt-1 accent-indigo-600"
            />
          </div>

          <hr className="border-slate-100" />
          <div className="text-xs text-slate-400">
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
        <div className="flex-1 min-h-0">
          <MapContainer ref={mapContainerRef} className="h-full shadow-lg border border-slate-200">

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
