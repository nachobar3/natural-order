'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'

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
  const [inputValue, setInputValue] = useState(value)

  // Keep input value in sync with prop
  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true)
      return
    }

    // Load Google Maps script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not found')
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoaded(true)
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
        componentRestrictions: { country: 'ar' },
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

  return (
    <div className="relative">
      <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
        <MapPin className="w-5 h-5 text-gray-500" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="input pl-10 pr-10"
        placeholder={isLoaded ? placeholder : 'Cargando...'}
        disabled={disabled}
        readOnly={!isLoaded}
        inputMode="text"
        autoComplete="off"
      />
      {!isLoaded && (
        <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      )}
    </div>
  )
}
