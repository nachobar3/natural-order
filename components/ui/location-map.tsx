'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, MapPin } from 'lucide-react'

interface LocationMapProps {
  latitude: number
  longitude: number
  radiusKm?: number
  userName?: string
}

declare global {
  interface Window {
    google: typeof google
    initMap: () => void
  }
}

export function LocationMap({
  latitude,
  longitude,
  radiusKm = 0.5,
  userName = 'Usuario'
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return

    try {
      // Slightly offset the center for privacy (random offset within 100m)
      const offsetLat = (Math.random() - 0.5) * 0.001
      const offsetLng = (Math.random() - 0.5) * 0.001
      const center = {
        lat: latitude + offsetLat,
        lng: longitude + offsetLng
      }

      // Create map with dark style
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        scrollwheel: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca3af' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#1e3a2f' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2d3748' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1a202c' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#3d4f5f' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2d3748' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0e1626' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#4a5568' }]
          }
        ]
      })

      // Add circle overlay
      new window.google.maps.Circle({
        strokeColor: '#22c55e',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.15,
        map,
        center,
        radius: radiusKm * 1000, // Convert km to meters
      })

      mapInstanceRef.current = map
      setLoading(false)
    } catch (err) {
      console.error('Error initializing map:', err)
      setError('Error al inicializar el mapa')
      setLoading(false)
    }
  }, [latitude, longitude, radiusKm])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('API key de Google Maps no configurada')
      setLoading(false)
      return
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initializeMap()
      return
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
    script.async = true
    script.defer = true
    script.onload = initializeMap
    script.onerror = () => {
      setError('Error al cargar Google Maps')
      setLoading(false)
    }
    document.head.appendChild(script)
  }, [initializeMap])

  if (error) {
    return (
      <div className="w-full h-[200px] bg-gray-900/50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[200px] rounded-lg overflow-hidden border border-mtg-green-900/30">
      {loading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-mtg-green-500" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      {/* Privacy notice */}
      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
        <p className="text-xs text-gray-400">
          Ubicación aproximada de {userName}
        </p>
      </div>
    </div>
  )
}
