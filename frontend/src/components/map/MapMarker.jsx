// src/components/map/MapMarker.jsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const MARKER_CONFIG = {
  Hotel:      { emoji: '🏨', bg: '#6366f1' },
  Restaurant: { emoji: '🍽️', bg: '#f59e0b' },
  Attraction: { emoji: '🗺️', bg: '#10b981' },
  User:       { emoji: '📍', bg: '#3b82f6' },
}

/**
 * Adds a custom emoji marker to a Mapbox map.
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {[number, number]} coordinates - [lng, lat]
 * @param {string} type - Hotel | Restaurant | Attraction | User
 * @param {Object} data - Entity data to store for popup
 * @param {Function} onClick - Callback when marker is clicked
 */
export function MapMarker({ map, coordinates, type, data, onClick }) {
  const markerRef = useRef(null)

  useEffect(() => {
    if (!map || !coordinates) return

    const config = MARKER_CONFIG[type] || MARKER_CONFIG.Attraction

    // Build custom DOM element
    const el = document.createElement('div')
    el.className = 'map-marker'
    el.style.cssText = `
      width: 38px; height: 38px; border-radius: 50%;
      background: ${config.bg}; border: 3px solid white;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      transition: transform 0.15s ease;
    `
    el.innerHTML = config.emoji
    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)' })
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

    if (onClick) el.addEventListener('click', () => onClick(data))

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(coordinates)
      .addTo(map)

    return () => {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }
  }, [map, coordinates, type, data, onClick])

  return null
}

export default MapMarker
