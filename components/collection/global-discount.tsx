'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Percent, X, PauseCircle } from 'lucide-react'

interface GlobalDiscountProps {
  onApplyAll?: () => void
  onSettingsChange?: (settings: { percentage: number; minimumPrice: number; collectionPaused: boolean }) => void
}

export function GlobalDiscount({ onApplyAll, onSettingsChange }: GlobalDiscountProps) {
  const [percentage, setPercentage] = useState(80)
  const [minimumPrice, setMinimumPrice] = useState(0)
  const [collectionPaused, setCollectionPaused] = useState(false)
  const [savedPercentage, setSavedPercentage] = useState(80)
  const [savedMinimumPrice, setSavedMinimumPrice] = useState(0)
  const [savedCollectionPaused, setSavedCollectionPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
        setCollectionPaused(data.collectionPaused ?? false)
        setSavedCollectionPaused(data.collectionPaused ?? false)
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
        body: JSON.stringify({ percentage, minimumPrice, collectionPaused }),
      })

      if (res.ok) {
        setSavedPercentage(percentage)
        setSavedMinimumPrice(minimumPrice)
        setSavedCollectionPaused(collectionPaused)
        onSettingsChange?.({ percentage, minimumPrice, collectionPaused })
        setIsModalOpen(false)
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

  const hasChanges = percentage !== savedPercentage ||
    minimumPrice !== savedMinimumPrice ||
    collectionPaused !== savedCollectionPaused

  const handleClose = () => {
    // Reset to saved values if closing without saving
    if (hasChanges) {
      setPercentage(savedPercentage)
      setMinimumPrice(savedMinimumPrice)
      setCollectionPaused(savedCollectionPaused)
    }
    setMessage(null)
    setIsModalOpen(false)
  }

  if (loading) {
    return (
      <button
        disabled
        className="h-9 flex items-center gap-2 px-3 text-sm bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-500"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Cargando...</span>
      </button>
    )
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`h-9 flex items-center gap-2 px-3 text-sm border rounded-lg transition-colors ${
          savedCollectionPaused
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:text-white hover:border-gray-600 hover:bg-gray-800'
        }`}
      >
        {savedCollectionPaused ? (
          <>
            <PauseCircle className="w-4 h-4" />
            <span>Pausada</span>
          </>
        ) : (
          <>
            <Percent className="w-4 h-4 text-mtg-green-400" />
            <span>Precios</span>
            <span className="text-xs text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
              {savedPercentage}%
            </span>
          </>
        )}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={handleClose}
          />

          {/* Modal content */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-mtg-green-400" />
                <h2 className="text-lg font-semibold text-gray-100">Configuración de precios</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Percentage setting */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Porcentaje del precio de mercado
                </label>
                <p className="text-xs text-gray-500">
                  Define a qué porcentaje del precio de referencia querés vender tus cartas.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={200}
                    value={percentage}
                    onChange={(e) => setPercentage(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-mtg-green-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={percentage}
                      onChange={(e) => setPercentage(Math.max(1, Math.min(200, parseInt(e.target.value) || 80)))}
                      className="w-16 px-2 py-1.5 text-sm text-center bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-mtg-green-500 focus:outline-none"
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                </div>
              </div>

              {/* Minimum price setting */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Precio mínimo por carta
                </label>
                <p className="text-xs text-gray-500">
                  Las cartas no se listarán por debajo de este precio (no aplica a precios fijos).
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={minimumPrice}
                    onChange={(e) => setMinimumPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-mtg-green-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-500">USD</span>
                </div>
              </div>

              {/* Vacation mode toggle */}
              <div className={`p-4 rounded-lg border transition-colors ${
                collectionPaused
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-gray-800/50 border-gray-700/50'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <PauseCircle className={`w-5 h-5 flex-shrink-0 ${collectionPaused ? 'text-amber-400' : 'text-gray-400'}`} />
                      <span className={`font-medium ${collectionPaused ? 'text-amber-400' : 'text-gray-300'}`}>
                        Pausar colección
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tu colección no aparecerá en ningún trade mientras esté pausada.
                    </p>
                  </div>
                  <button
                    onClick={() => setCollectionPaused(!collectionPaused)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
                      collectionPaused ? 'bg-amber-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                        collectionPaused ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-mtg-green-500/10 text-mtg-green-400 border border-mtg-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {message.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-t border-gray-800 bg-gray-900/50">
              <button
                onClick={applyToAll}
                disabled={applying || saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar a todas las cartas'
                )}
              </button>
              <button
                onClick={saveSettings}
                disabled={saving || applying || !hasChanges}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-mtg-green-600 hover:bg-mtg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
