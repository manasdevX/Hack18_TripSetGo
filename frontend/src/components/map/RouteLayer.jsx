// src/components/map/RouteLayer.jsx
import { useEffect } from 'react'
import mapboxgl from 'mapbox-gl'

const SOURCE_ID = 'trip-route-source'
const LAYER_ID  = 'trip-route-layer'

/**
 * Draws a GeoJSON LineString route on the map between ordered coordinates.
 * @param {mapboxgl.Map} mapRef.current - Mapbox map instance
 * @param {boolean} mapLoaded - Whether the map has fired the 'load' event
 * @param {Array<[number,number]>} coordinates - Ordered [lng, lat] pairs
 * @param {string} color - Route line color
 */
export function RouteLayer({ mapRef, mapLoaded, coordinates = [], color = '#6366f1' }) {
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || coordinates.length < 2) return

    const geojson = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates }
    }

    // Remove previous route if exists
    if (map.getSource(SOURCE_ID)) {
      map.getSource(SOURCE_ID).setData(geojson)
      return
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

    map.addLayer({
      id:     LAYER_ID,
      type:   'line',
      source: SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': 4,
        'line-opacity': 0.85,
        'line-dasharray': [2, 1]
      }
    })

    // Fit map to route bounds
    const bounds = coordinates.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    )
    map.fitBounds(bounds, { padding: 60 })

    return () => {
      if (map.getLayer(LAYER_ID))  map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [mapRef, mapLoaded, coordinates, color])

  return null
}

export default RouteLayer
