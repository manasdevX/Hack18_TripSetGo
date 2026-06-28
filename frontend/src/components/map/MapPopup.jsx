// src/components/map/MapPopup.jsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const TYPE_LABELS = { Hotel: '⭐ Hotel', Restaurant: '🍴 Restaurant', Attraction: '🏛️ Attraction' }

/**
 * Renders a styled Mapbox popup at specified coordinates.
 * Handles both MongoDB entities and live API normalised entities.
 */
export function MapPopup({ map, entity, onClose }) {
  const popupRef = useRef(null)

  useEffect(() => {
    if (!map || !entity) return

    const { name, averageRating, city, _entityType, location, address, image, category, distanceLabel, isOpenNow } = entity
    const [lng, lat] = location?.coordinates || [0, 0]

    const ratingDisplay = averageRating && averageRating > 0
      ? `<div style="font-size:13px; color:#fbbf24; font-weight:600;">★ ${typeof averageRating === 'number' ? averageRating.toFixed(1) : averageRating}</div>`
      : ''

    const imageDisplay = image
      ? `<div style="width:100%; height:90px; border-radius:8px; overflow:hidden; margin-bottom:8px;">
           <img src="${image}" alt="${name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'" />
         </div>`
      : ''

    const addressDisplay = address
      ? `<div style="font-size:12px; color:#94a3b8; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">📍 ${address}</div>`
      : ''

    const categoryDisplay = category && category !== _entityType
      ? `<span style="font-size:10px; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; color:#cbd5e1; margin-left:6px;">${category}</span>`
      : ''

    const distanceDisplay = distanceLabel
      ? `<span style="font-size:11px; color:#a5b4fc; margin-left:4px;">· ${distanceLabel}</span>`
      : ''

    const openDisplay = isOpenNow != null
      ? `<span style="font-size:10px; padding:2px 6px; border-radius:4px; font-weight:600; margin-left:6px; background:${isOpenNow ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isOpenNow ? '#10b981' : '#ef4444'};">${isOpenNow ? 'Open' : 'Closed'}</span>`
      : ''

    const html = `
      <div style="min-width:190px; max-width:240px; font-family: 'Inter', sans-serif;">
        ${imageDisplay}
        <div style="font-size:11px; color:#a5b4fc; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; display:flex; align-items:center; flex-wrap:wrap;">
          ${TYPE_LABELS[_entityType] || _entityType}${categoryDisplay}${distanceDisplay}
        </div>
        <div style="font-size:15px; font-weight:700; color:#ffffff; margin-bottom:4px;">${name}</div>
        ${addressDisplay}
        <div style="font-size:13px; color:#94a3b8; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
          ${city || ''}${openDisplay}
        </div>
        ${ratingDisplay}
      </div>
    `

    popupRef.current = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '260px' })
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

