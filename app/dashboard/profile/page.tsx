'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Mail,
  Globe,
  Loader2,
  MapPin,
  RefreshCcw,
  Bell,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react'
import type { User as UserType, Location, Preferences } from '@/types/database'

// Lazy load AddressAutocomplete - only loaded when user visits "ubicacion" tab
// This saves ~200KB of Google Maps Places API from being loaded on other tabs
const AddressAutocomplete = dynamic(
  () => import('@/components/ui/address-autocomplete').then(mod => mod.AddressAutocomplete),
  {
    ssr: false,
    loading: () => (
      <div className="input animate-pulse bg-gray-700/50 h-10" />
    ),
  }
)

type TabKey = 'datos' | 'ubicacion' | 'preferencias' | 'cuenta'

const tabs: { key: TabKey; label: string; shortLabel: string; icon: typeof User }[] = [
  { key: 'datos', label: 'Datos personales', shortLabel: 'Datos', icon: User },
  { key: 'ubicacion', label: 'Ubicación', shortLabel: 'Ubicación', icon: MapPin },
  { key: 'preferencias', label: 'Preferencias', shortLabel: 'Prefs', icon: RefreshCcw },
  { key: 'cuenta', label: 'Cuenta', shortLabel: 'Cuenta', icon: Bell },
]

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabKey) || 'datos'

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [profile, setProfile] = useState<UserType | null>(null)
  // Location and preferences state is set via individual form fields
  const [, setLocation] = useState<Location | null>(null)
  const [, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('es')

  // Location form state
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radiusKm, setRadiusKm] = useState(25)

  // Preferences form state
  const [tradeMode, setTradeMode] = useState<'trade' | 'sell' | 'buy' | 'both'>('both')
  const [minMatchThreshold, setMinMatchThreshold] = useState(1)
  const [notifyNewMatches, setNotifyNewMatches] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState(true)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setDisplayName(profileData.display_name)
        setPreferredLanguage(profileData.preferred_language)
      }

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

      // Load preferences
      const { data: preferencesData } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (preferencesData) {
        setPreferences(preferencesData)
        setTradeMode(preferencesData.trade_mode)
        setMinMatchThreshold(preferencesData.min_match_threshold)
        setNotifyNewMatches(preferencesData.notify_new_matches)
        setNotifyMessages(preferencesData.notify_messages)
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    window.history.replaceState({}, '', url.toString())
  }, [activeTab])

  const handleAddressChange = useCallback((newAddress: string, lat: number, lng: number) => {
    setAddress(newAddress)
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  async function handleSaveProfile() {
    if (!profile) return

    setSaving(true)
    setError(null)
    setSaved(false)

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

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSaveLocation() {
    if (!profile || !address || !latitude || !longitude) return

    setSaving(true)
    setError(null)
    setSaved(false)

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

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSavePreferences() {
    if (!profile) return

    setSaving(true)
    setError(null)
    setSaved(false)

    const { error: prefError } = await supabase
      .from('preferences')
      .upsert({
        user_id: profile.id,
        trade_mode: tradeMode,
        min_match_threshold: minMatchThreshold,
        notify_new_matches: notifyNewMatches,
        notify_messages: notifyMessages,
        has_been_configured: true, // Mark as explicitly configured by user
      }, {
        onConflict: 'user_id'
      })

    if (prefError) {
      setError('Error al guardar las preferencias')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Mi perfil</h1>
        <p className="text-gray-400 mt-1">
          Administrá tu información personal, ubicación y preferencias
        </p>
      </div>

      {/* Success/Error messages */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 p-4 rounded-lg bg-mtg-green-500/20 border border-mtg-green-500/50 text-mtg-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Cambios guardados correctamente
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs - Mobile: horizontal fixed grid at top, Desktop: vertical on left */}
        <div className="md:w-48 flex-shrink-0">
          {/* Mobile tabs (horizontal grid - no scroll) */}
          <div className="grid grid-cols-4 gap-1 md:hidden pb-3 mb-3 border-b border-gray-800">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-mtg-green-600/20 text-mtg-green-400'
                      : 'text-gray-400 hover:bg-mtg-green-900/20 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="truncate w-full text-center">{tab.shortLabel}</span>
                </button>
              )
            })}
          </div>

          {/* Desktop tabs (vertical) */}
          <div className="hidden md:flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === tab.key
                      ? 'bg-mtg-green-600/20 text-mtg-green-400 border-l-2 border-mtg-green-500'
                      : 'text-gray-400 hover:bg-mtg-green-900/20 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1">
          {/* Datos personales */}
          {activeTab === 'datos' && (
            <div className="space-y-6">
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

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
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
            </div>
          )}

          {/* Ubicación */}
          {activeTab === 'ubicacion' && (
            <div className="space-y-6">
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

              <div className="flex justify-end">
                <button
                  onClick={handleSaveLocation}
                  disabled={saving || !address || !latitude}
                  className="btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar ubicación'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Preferencias */}
          {activeTab === 'preferencias' && (
            <div className="space-y-6">
              {/* Trade preferences */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-mtg-gold/20">
                    <RefreshCcw className="w-5 h-5 text-mtg-gold" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-100">
                    Preferencias de trade
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Modo de intercambio</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'both', label: 'Todos', description: 'Trade, compra y venta' },
                        { value: 'trade', label: 'Solo trade', description: 'Solo intercambios mutuos' },
                        { value: 'buy', label: 'Solo compra', description: 'Comprar cartas que buscás' },
                        { value: 'sell', label: 'Solo venta', description: 'Vender cartas de tu colección' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTradeMode(option.value as typeof tradeMode)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            tradeMode === option.value
                              ? 'border-mtg-green-500 bg-mtg-green-600/20'
                              : 'border-mtg-green-900/30 hover:border-mtg-green-600/50'
                          }`}
                        >
                          <div className={`text-sm font-medium ${
                            tradeMode === option.value ? 'text-mtg-green-400' : 'text-gray-300'
                          }`}>
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      Umbral mínimo de coincidencia: {minMatchThreshold}
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                      Solo mostrar coincidencias con al menos este número de cartas en común
                    </p>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={minMatchThreshold}
                      onChange={(e) => setMinMatchThreshold(parseInt(e.target.value))}
                      className="w-full h-2 bg-mtg-green-900/30 rounded-lg appearance-none cursor-pointer accent-mtg-green-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Bell className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-100">
                    Notificaciones
                  </h2>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-mtg-green-900/30 cursor-pointer hover:bg-mtg-green-900/10">
                    <div>
                      <p className="font-medium text-gray-100">Nuevos trades</p>
                      <p className="text-sm text-gray-500">
                        Recibí notificaciones cuando haya nuevas coincidencias
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyNewMatches}
                      onChange={(e) => setNotifyNewMatches(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-mtg-dark text-mtg-green-500 focus:ring-mtg-green-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-mtg-green-900/30 cursor-pointer hover:bg-mtg-green-900/10">
                    <div>
                      <p className="font-medium text-gray-100">Mensajes</p>
                      <p className="text-sm text-gray-500">
                        Recibí notificaciones de nuevos mensajes
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyMessages}
                      onChange={(e) => setNotifyMessages(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-mtg-dark text-mtg-green-500 focus:ring-mtg-green-500"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar preferencias'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cuenta */}
          {activeTab === 'cuenta' && (
            <div className="space-y-6">
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

              {/* Danger zone */}
              <div className="card border-red-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-100">
                    Zona de peligro
                  </h2>
                </div>

                <p className="text-gray-400 mb-4">
                  Una vez que elimines tu cuenta, no hay vuelta atrás. Esta acción es permanente.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-danger"
                  >
                    Eliminar mi cuenta
                  </button>
                ) : (
                  <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-400">
                          ¿Estás seguro de que querés eliminar tu cuenta?
                        </p>
                        <p className="text-sm text-red-400/70 mt-1">
                          Esta acción eliminará todos tus datos permanentemente.
                        </p>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="btn-secondary"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                            className="btn-danger"
                          >
                            {deleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Sí, eliminar mi cuenta'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
