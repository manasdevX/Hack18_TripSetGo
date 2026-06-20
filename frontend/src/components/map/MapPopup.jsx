// src/components/map/MapPopup.jsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const STAR_MAP = { Hotel: '⭐ Hotel', Restaurant: '🍴 Restaurant', Attraction: '🏛️ Attraction' }

/**
 * Renders a styled Mapbox popup at specified coordinates.
 */
export function MapPopup({ map, entity, onClose }) {
  const popupRef = useRef(null)

  useEffect(() => {
    if (!map || !entity) return

    const { name, averageRating, city, _entityType, location } = entity
    const [lng, lat] = location?.coordinates || [0, 0]

    const html = `
      <div style="min-width:180px; font-family: 'Inter', sans-serif;">
        <div style="font-size:11px; color:#a5b4fc; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">
          ${STAR_MAP[_entityType] || _entityType}
        </div>
        <div style="font-size:15px; font-weight:700; color:#ffffff; margin-bottom:4px;">${name}</div>
        <div style="font-size:13px; color:#94a3b8; margin-bottom:6px;">${city || ''}</div>
        ${averageRating ? `<div style="font-size:13px; color:#fbbf24; font-weight:600;">★ ${averageRating.toFixed(1)}</div>` : ''}
      </div>
    `

    popupRef.current = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '240px' })
      .setLngLat([lng, lat])
      .setHTML(html)
      .addTo(map)

    popupRef.current.on('close', () => { if (onClose) onClose() })

    return () => {
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }
    }
  }, [map, entity, onClose])

  return null
}

export default MapPopup
