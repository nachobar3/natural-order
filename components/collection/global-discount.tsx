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
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Cargando configuración...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 px-1">
      {/* Settings icon and label */}
      <div className="flex items-center gap-1.5 text-gray-400">
        <Settings className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Precios:</span>
      </div>

      {/* Percentage setting - inline */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Global</span>
        <input
          type="number"
          min={1}
          max={200}
          value={percentage}
          onChange={(e) => setPercentage(Math.max(1, Math.min(200, parseInt(e.target.value) || 80)))}
          className="w-14 px-2 py-1 text-xs text-center bg-gray-800/50 border border-gray-700/50 rounded text-gray-100 focus:border-mtg-green-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">%</span>
      </div>

      {/* Divider */}
      <span className="text-gray-700 hidden sm:inline">|</span>

      {/* Minimum price setting - inline */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Mínimo</span>
        <span className="text-xs text-gray-500">$</span>
        <input
          type="number"
          min={0}
          step={0.05}
          value={minimumPrice}
          onChange={(e) => setMinimumPrice(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-14 px-2 py-1 text-xs text-center bg-gray-800/50 border border-gray-700/50 rounded text-gray-100 focus:border-mtg-green-500 focus:outline-none"
        />
      </div>

      {/* Actions - more compact */}
      <div className="flex items-center gap-2 ml-auto">
        {hasChanges && (
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
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
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-mtg-green-600/80 hover:bg-mtg-green-500 text-white rounded transition-colors disabled:opacity-50"
        >
          {applying ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Aplicando...</span>
            </>
          ) : (
            'Aplicar a todas'
          )}
        </button>
      </div>

      {/* Message - inline */}
      {message && (
        <span className={`text-xs ${message.type === 'success' ? 'text-mtg-green-400' : 'text-red-400'}`}>
          {message.text}
        </span>
      )}
    </div>
  )
}
