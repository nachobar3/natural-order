'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Globe, Loader2, MapPin } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import type { User as UserType, Location } from '@/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserType | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('es')

  // Location state
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radiusKm, setRadiusKm] = useState(10)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError('Error al cargar el perfil')
        setLoading(false)
        return
      }

      setProfile(profileData)
      setDisplayName(profileData.display_name)
      setPreferredLanguage(profileData.preferred_language)

      // Load location
      const { data: locationData } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (locationData) {
        setLocation(locationData)
        setAddress(locationData.address || '')
        setLatitude(locationData.latitude)
        setLongitude(locationData.longitude)
        setRadiusKm(locationData.radius_km)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const handleAddressChange = useCallback((newAddress: string, lat: number, lng: number) => {
    setAddress(newAddress)
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setError(null)

    // Update profile
    const { error: profileError } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        preferred_language: preferredLanguage,
      })
      .eq('id', profile.id)

    if (profileError) {
      setError('Error al guardar el perfil')
      setSaving(false)
      return
    }

    // Update or create location if address is set (using upsert)
    if (address && latitude && longitude) {
      const locationData = {
        user_id: profile.id,
        name: 'Mi ubicación',
        address,
        latitude,
        longitude,
        radius_km: radiusKm,
        is_active: true,
      }

      const { error: locationError } = await supabase
        .from('locations')
        .upsert(locationData, { onConflict: 'user_id' })

      if (locationError) {
        setError('Error al guardar la ubicación')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Mi perfil</h1>
        <p className="text-gray-400 mt-1">
          Administrá tu información personal y ubicación
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Información básica
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  className="input pl-10 opacity-60"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                El email no se puede cambiar
              </p>
            </div>

            <div>
              <label htmlFor="displayName" className="label">Nombre para mostrar</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input pl-10"
                  placeholder="Tu nombre"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="language" className="label">Idioma preferido</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <select
                  id="language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="input pl-10 appearance-none cursor-pointer"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-mtg-green-600/20">
              <MapPin className="w-5 h-5 text-mtg-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">
                Mi ubicación
              </h2>
              <p className="text-sm text-gray-400">
                Usaremos tu ubicación para encontrar trades cerca tuyo
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="address" className="label">Dirección</label>
              <AddressAutocomplete
                value={address}
                onChange={handleAddressChange}
                placeholder="Ingresá tu dirección"
              />
              {address && latitude && longitude && (
                <p className="text-xs text-gray-500 mt-1">
                  Coordenadas: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="radius" className="label">
                Radio de búsqueda: {radiusKm} km
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Te mostraremos trades dentro de este radio
              </p>
              <input
                id="radius"
                type="range"
                min="1"
                max="50"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="w-full h-2 bg-mtg-green-900/30 rounded-lg appearance-none cursor-pointer accent-mtg-green-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Información de la cuenta
          </h2>
          <div className="text-sm text-gray-400">
            <p>
              <span className="font-medium text-gray-300">Miembro desde:</span>{' '}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('es', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
