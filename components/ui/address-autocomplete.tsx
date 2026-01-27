'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, lat: number, lng: number) => void
  placeholder?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Ingresá tu dirección',
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  // Keep input value in sync with prop
  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true)
      setIsLoading(false)
      return
    }

    // Load Google Maps script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not found - address autocomplete disabled')
      setIsLoading(false)
      setHasError(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoaded(true)
      setIsLoading(false)
    }
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      setIsLoading(false)
      setHasError(true)
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    // Initialize autocomplete (using legacy API - still supported)
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['address'],
        fields: ['formatted_address', 'geometry'],
      }
    )

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()

      if (place?.formatted_address && place?.geometry?.location) {
        const address = place.formatted_address
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        setInputValue(address)
        onChange(address, lat, lng)
      }
    })
  }, [isLoaded, onChange])

  // Fallback geocoding using Nominatim (OpenStreetMap) when Google Maps is unavailable
  const handleBlur = async () => {
    if (isLoaded || !inputValue.trim() || isLoading) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&limit=5`,
        {
          headers: {
            'User-Agent': 'NaturalOrder/1.0',
          },
        }
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        onChange(inputValue, lat, lng)
      }
    } catch (error) {
      console.error('Fallback geocoding failed:', error)
    }
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
          <MapPin className="w-5 h-5 text-gray-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          className="input pl-10 pr-10"
          placeholder={isLoading ? 'Cargando...' : placeholder}
          disabled={disabled}
          readOnly={isLoading}
          inputMode="text"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        )}
        {hasError && !isLoading && (
          <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
        )}
      </div>
      {hasError && (
        <p className="text-xs text-yellow-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Autocompletado no disponible. Ingresá la dirección manualmente.
        </p>
      )}
    </div>
  )
}
