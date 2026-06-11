// src/hooks/useMapbox.js
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

/**
 * Custom hook that initializes a Mapbox GL map on a container ref.
 * Exposes `map` as React state (safe to read in JSX) alongside `mapRef`.
 * Also provides the user's current GPS location.
 */
export function useMapbox(options = {}) {
  const mapContainerRef  = useRef(null)
  const mapRef           = useRef(null)
  const initOptionsRef   = useRef(options)  // snapshot on mount — prevents stale dep warning
  const [map, setMap]               = useState(null)   // safe to use in JSX
  const [mapLoaded, setMapLoaded]   = useState(false)
  const [userLocation, setUserLocation] = useState(null)

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const opts = initOptionsRef.current
    const instance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     opts.style  || 'mapbox://styles/mapbox/streets-v12',
      center:    opts.center || [78.9629, 20.5937],
      zoom:      opts.zoom   || 4,
    })

    instance.addControl(new mapboxgl.NavigationControl(), 'top-right')
    instance.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    instance.on('load', () => {
      setMap(instance)   // expose to React tree
      setMapLoaded(true)
    })

    mapRef.current = instance

    return () => {
      instance.remove()
      mapRef.current = null
      setMap(null)
      setMapLoaded(false)
    }
  }, []) // intentionally run once

  // Request user GPS location and fly the map to it
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = [coords.longitude, coords.latitude]
        setUserLocation(loc)
        if (mapRef.current) {
          mapRef.current.flyTo({ center: loc, zoom: 13, speed: 1.5 })
        }
      },
      () => console.warn('Geolocation permission denied or unavailable')
    )
  }, [])

  return { mapRef, mapContainerRef, map, userLocation, mapLoaded, requestLocation }
}

