'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Settings } from 'lucide-react'

interface GlobalDiscountProps {
  onApplyAll?: () => void
  onSettingsChange?: (settings: { percentage: number; minimumPrice: number }) => void
}

export function GlobalDiscount({ onApplyAll, onSettingsChange }: GlobalDiscountProps) {
  const [percentage, setPercentage] = useState(80)
  const [minimumPrice, setMinimumPrice] = useState(0)
  const [savedPercentage, setSavedPercentage] = useState(80)
  const [savedMinimumPrice, setSavedMinimumPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadGlobalDiscount()
  }, [])

  const loadGlobalDiscount = async () => {
    try {
      const res = await fetch('/api/preferences/global-discount')
      if (res.ok) {
        const data = await res.json()
        setPercentage(data.percentage)
        setSavedPercentage(data.percentage)
        setMinimumPrice(data.minimumPrice ?? 0)
        setSavedMinimumPrice(data.minimumPrice ?? 0)
      }
    } catch (error) {
      console.error('Error loading global discount:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/preferences/global-discount', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage, minimumPrice }),
      })

      if (res.ok) {
        setSavedPercentage(percentage)
        setSavedMinimumPrice(minimumPrice)
        setMessage({ type: 'success', text: 'Guardado' })
        onSettingsChange?.({ percentage, minimumPrice })
        setTimeout(() => setMessage(null), 2000)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Error al guardar' })
      }
    } catch (error) {
      console.error('Error saving global discount:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  const applyToAll = async () => {
    setApplying(true)
    setMessage(null)

    try {
      const res = await fetch('/api/preferences/global-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage }),
      })

      if (res.ok) {
        const data = await res.json()
        setSavedPercentage(percentage)
        setMessage({ type: 'success', text: data.message })
        onApplyAll?.()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Error al aplicar' })
      }
    } catch (error) {
      console.error('Error applying global discount:', error)
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setApplying(false)
    }
  }

  const hasChanges = percentage !== savedPercentage || minimumPrice !== savedMinimumPrice

  if (loading) {
    return (
      <div className="card bg-gray-800/30 border-gray-700/50 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-gray-800/30 border-gray-700/50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-200">Configurar precios</h3>
      </div>

      {/* Settings row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* Percentage setting */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-300">Precio global</p>
            <p className="text-xs text-gray-500">% del precio CK</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="number"
              min={1}
              max={200}
              value={percentage}
              onChange={(e) => setPercentage(Math.max(1, Math.min(200, parseInt(e.target.value) || 80)))}
              className="w-16 px-2 py-1 text-sm text-center bg-gray-900 border border-gray-700 rounded text-gray-100 focus:border-mtg-green-500 focus:outline-none"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>

        {/* Minimum price setting */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-300">Precio mínimo</p>
            <p className="text-xs text-gray-500">Piso por carta</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={minimumPrice}
              onChange={(e) => setMinimumPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-16 px-2 py-1 text-sm text-center bg-gray-900 border border-gray-700 rounded text-gray-100 focus:border-mtg-green-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {hasChanges && (
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Guardar
            </button>
          )}
          <button
            onClick={applyToAll}
            disabled={applying}
            className="px-3 py-1.5 text-xs font-medium bg-mtg-green-600 hover:bg-mtg-green-500 text-white rounded transition-colors disabled:opacity-50"
          >
            {applying ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Aplicando...
              </span>
            ) : (
              'Aplicar a todas'
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <p className={`text-xs mt-2 ${message.type === 'success' ? 'text-mtg-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
