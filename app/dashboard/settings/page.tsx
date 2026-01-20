'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  RefreshCcw,
  Bell,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react'
import type { Preferences } from '@/types/database'

export default function SettingsPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [tradeMode, setTradeMode] = useState<'trade' | 'sell' | 'both'>('both')
  const [minMatchThreshold, setMinMatchThreshold] = useState(1)
  const [notifyNewMatches, setNotifyNewMatches] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadPreferences()
  }, [])

  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      setError('Error al cargar preferencias')
    } else if (data) {
      setPreferences(data)
      setTradeMode(data.trade_mode)
      setMinMatchThreshold(data.min_match_threshold)
      setNotifyNewMatches(data.notify_new_matches)
      setNotifyMessages(data.notify_messages)
    }
    setLoading(false)
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase
      .from('preferences')
      .upsert({
        user_id: user.id,
        trade_mode: tradeMode,
        min_match_threshold: minMatchThreshold,
        notify_new_matches: notifyNewMatches,
        notify_messages: notifyMessages,
      })

    if (error) {
      setError('Error al guardar preferencias')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDeleteAccount() {
    setDeleting(true)

    // Since admin delete won't work from client, sign out instead
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
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Configuración</h1>
        <p className="text-gray-400 mt-1">
          Personalizá tu experiencia en Natural Order
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 p-4 rounded-lg bg-mtg-green-500/20 border border-mtg-green-500/50 text-mtg-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Preferencias guardadas correctamente
        </div>
      )}

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
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'trade', label: 'Solo trade' },
                  { value: 'sell', label: 'Solo venta' },
                  { value: 'both', label: 'Ambos' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTradeMode(option.value as typeof tradeMode)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      tradeMode === option.value
                        ? 'border-mtg-green-500 bg-mtg-green-600/20 text-mtg-green-400'
                        : 'border-mtg-green-900/30 text-gray-400 hover:border-mtg-green-600/50 hover:text-gray-300'
                    }`}
                  >
                    {option.label}
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
                <p className="font-medium text-gray-100">Nuevos matches</p>
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

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
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
    </div>
  )
}
