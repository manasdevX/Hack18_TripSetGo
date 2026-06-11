// src/components/map/MapContainer.jsx
import { forwardRef } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

/**
 * Core map container div. The ref is forwarded to be used by the useMapbox hook.
 */
const MapContainer = forwardRef(function MapContainer({ className = '', children }, ref) {
  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden ${className}`}>
      <div ref={ref} className="absolute inset-0" />
      {children}
    </div>
  )
})

export default MapContainer
