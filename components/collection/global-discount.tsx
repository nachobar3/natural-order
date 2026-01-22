'use client'

import { useState, useEffect } from 'react'
import { Percent, Check, Loader2 } from 'lucide-react'

interface GlobalDiscountProps {
  onApplyAll?: () => void
}

export function GlobalDiscount({ onApplyAll }: GlobalDiscountProps) {
  const [percentage, setPercentage] = useState(80)
  const [savedPercentage, setSavedPercentage] = useState(80)
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
      }
    } catch (error) {
      console.error('Error loading global discount:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePercentage = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/preferences/global-discount', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage }),
      })

      if (res.ok) {
        setSavedPercentage(percentage)
        setMessage({ type: 'success', text: 'Guardado' })
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

  const hasChanges = percentage !== savedPercentage

  if (loading) {
    return (
      <div className="card bg-gray-800/30 border-gray-700/50">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-gray-800/30 border-gray-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon and label */}
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-mtg-green-600/20">
            <Percent className="w-4 h-4 text-mtg-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200">Descuento global</p>
            <p className="text-xs text-gray-500 hidden sm:block">
              Las nuevas cartas se listarán a este % del precio CK
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Percentage input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={200}
              value={percentage}
              onChange={(e) => setPercentage(Math.max(1, Math.min(200, parseInt(e.target.value) || 80)))}
              className="w-16 px-2 py-1.5 text-sm text-center bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:border-mtg-green-500 focus:outline-none"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>

          {/* Save button (only if changed) */}
          {hasChanges && (
            <button
              onClick={savePercentage}
              disabled={saving}
              className="p-1.5 text-mtg-green-400 hover:bg-mtg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
              title="Guardar"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Apply to all button */}
          <button
            onClick={applyToAll}
            disabled={applying}
            className="px-3 py-1.5 text-xs font-medium bg-mtg-green-600 hover:bg-mtg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {applying ? (
              <span className="flex items-center gap-1">
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
        <p className={`mt-2 text-xs ${message.type === 'success' ? 'text-mtg-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
