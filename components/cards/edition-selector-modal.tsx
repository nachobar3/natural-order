'use client'

import { useState, useMemo } from 'react'
import { X, Search, Check } from 'lucide-react'
import Image from 'next/image'

interface CardPrinting {
  scryfall_id: string
  oracle_id: string
  name: string
  set_code: string
  set_name: string
  collector_number: string | null
  image_uri: string | null
  image_uri_small: string | null
  prices_usd: number | null
  rarity: string | null
  released_at: string | null
}

interface EditionSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (selectedIds: string[]) => void
  printings: CardPrinting[]
  selectedIds: string[]
  cardName: string
}

export function EditionSelectorModal({
  isOpen,
  onClose,
  onSave,
  printings,
  selectedIds: initialSelectedIds,
  cardName,
}: EditionSelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds))
  const [searchQuery, setSearchQuery] = useState('')

  // Group printings by year
  const groupedPrintings = useMemo(() => {
    const filtered = printings.filter((p) =>
      p.set_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.set_code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groups: Record<string, CardPrinting[]> = {}
    filtered.forEach((printing) => {
      const year = printing.released_at?.substring(0, 4) || 'Unknown'
      if (!groups[year]) groups[year] = []
      groups[year].push(printing)
    })

    // Sort years descending
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [printings, searchQuery])

  const toggleEdition = (scryfallId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(scryfallId)) {
      newSelected.delete(scryfallId)
    } else {
      newSelected.add(scryfallId)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    const allIds = printings.map((p) => p.scryfall_id)
    setSelectedIds(new Set(allIds))
  }

  const clearAll = () => {
    setSelectedIds(new Set())
  }

  const handleSave = () => {
    onSave(Array.from(selectedIds))
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-mtg-dark border border-mtg-green-900/50 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-mtg-green-900/30">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Seleccionar ediciones
            </h2>
            <p className="text-sm text-gray-400">{cardName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and actions */}
        <div className="p-4 border-b border-mtg-green-900/30 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por set..."
              className="input pl-10 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedIds.size} de {printings.length} seleccionadas
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 text-mtg-green-400 hover:bg-mtg-green-900/20 rounded transition-colors"
              >
                Seleccionar todas
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 text-gray-400 hover:bg-gray-800 rounded transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Printings list */}
        <div className="flex-1 overflow-y-auto p-4">
          {groupedPrintings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No se encontraron ediciones
            </p>
          ) : (
            <div className="space-y-6">
              {groupedPrintings.map(([year, yearPrintings]) => (
                <div key={year}>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    {year}
                  </h3>
                  <div className="space-y-1">
                    {yearPrintings.map((printing) => {
                      const isSelected = selectedIds.has(printing.scryfall_id)
                      return (
                        <button
                          key={printing.scryfall_id}
                          onClick={() => toggleEdition(printing.scryfall_id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-mtg-green-600/20 border border-mtg-green-500/50'
                              : 'hover:bg-gray-800/50 border border-transparent'
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'bg-mtg-green-600 text-white'
                                : 'bg-gray-700 border border-gray-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          {/* Image */}
                          {printing.image_uri_small ? (
                            <Image
                              src={printing.image_uri_small}
                              alt={printing.name}
                              width={32}
                              height={45}
                              className="rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-[45px] bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                              ?
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm text-gray-200 truncate">
                              {printing.set_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {printing.set_code.toUpperCase()} #{printing.collector_number}
                              {printing.rarity && (
                                <span className={`ml-2 capitalize ${
                                  printing.rarity === 'mythic' ? 'text-orange-400' :
                                  printing.rarity === 'rare' ? 'text-yellow-400' :
                                  printing.rarity === 'uncommon' ? 'text-gray-300' :
                                  'text-gray-500'
                                }`}>
                                  {printing.rarity}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Price */}
                          {printing.prices_usd && (
                            <span className="text-sm text-mtg-green-400 flex-shrink-0">
                              ${printing.prices_usd.toFixed(2)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-mtg-green-900/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={selectedIds.size === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  )
}
