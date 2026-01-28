'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  X,
  Search,
  Loader2,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface CollectionCard {
  collectionId: string
  cardId: string
  cardName: string
  cardSetCode: string
  cardSetName: string
  cardImageUri: string | null
  cardImageUriSmall: string | null
  condition: string
  isFoil: boolean
  quantity: number
  askingPrice: number | null
  alreadyInTrade: boolean
  rarity?: string | null
  cmc?: number | null
}

// Filter options
const CONDITIONS = [
  { value: '', label: 'Todas' },
  { value: 'NM', label: 'NM' },
  { value: 'LP', label: 'LP' },
  { value: 'MP', label: 'MP' },
  { value: 'HP', label: 'HP' },
  { value: 'DMG', label: 'DMG' },
]

const FOIL_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'foil', label: 'Solo foil' },
  { value: 'non-foil', label: 'Solo no-foil' },
]

const RARITIES = [
  { value: '', label: 'Todas' },
  { value: 'mythic', label: 'Mítica' },
  { value: 'rare', label: 'Rara' },
  { value: 'uncommon', label: 'Infrecuente' },
  { value: 'common', label: 'Común' },
]

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Más recientes' },
  { value: 'date-asc', label: 'Más antiguos' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
]

const COLORS = [
  { id: 'W', symbol: '⚪' },
  { id: 'U', symbol: '🔵' },
  { id: 'B', symbol: '⚫' },
  { id: 'R', symbol: '🔴' },
  { id: 'G', symbol: '🟢' },
  { id: 'C', symbol: '◇' },
]

interface CounterpartCollectionDrawerProps {
  matchId: string
  otherUserName: string
  isOpen: boolean
  onClose: () => void
  onCardAdded: () => void
}

export function CounterpartCollectionDrawer({
  matchId,
  otherUserName,
  isOpen,
  onClose,
  onCardAdded,
}: CounterpartCollectionDrawerProps) {
  const [cards, setCards] = useState<CollectionCard[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [addingCard, setAddingCard] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [condition, setCondition] = useState('')
  const [foil, setFoil] = useState('')
  const [rarity, setRarity] = useState('')
  const [colors, setColors] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('date-desc')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [condition, foil, rarity, colors, sortBy])

  const loadCollection = useCallback(async () => {
    if (!isOpen) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort: sortBy,
      })
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }
      if (condition) {
        params.set('condition', condition)
      }
      if (foil) {
        params.set('foil', foil)
      }
      if (rarity) {
        params.set('rarity', rarity)
      }
      if (colors.length > 0) {
        params.set('colors', colors.join(','))
      }

      const res = await fetch(`/api/matches/${matchId}/counterpart-collection?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
        setTotalPages(data.totalPages || 0)
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Error loading collection:', err)
    } finally {
      setLoading(false)
    }
  }, [matchId, isOpen, page, debouncedSearch, condition, foil, rarity, colors, sortBy])

  useEffect(() => {
    loadCollection()
  }, [loadCollection])

  // Focus search input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const addCardToTrade = async (collectionId: string) => {
    setAddingCard(collectionId)
    try {
      const res = await fetch(`/api/matches/${matchId}/cards/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      })

      if (res.ok) {
        // Mark as already in trade locally
        setCards(prev =>
          prev.map(c =>
            c.collectionId === collectionId
              ? { ...c, alreadyInTrade: true }
              : c
          )
        )
        onCardAdded()
      } else {
        const data = await res.json()
        console.error('Error adding card:', data.error)
      }
    } catch (err) {
      console.error('Error adding card:', err)
    } finally {
      setAddingCard(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - only visible on desktop */}
      <div
        className="hidden lg:block fixed inset-0 bg-black/80 z-[55]"
        onClick={onClose}
      />

      {/* Modal - full screen solid on mobile, centered modal on desktop */}
      <div className="fixed inset-0 z-[60] bg-[#0a0a0a] lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90vw] lg:max-w-5xl lg:h-[85vh] lg:rounded-2xl lg:bg-[#0d0d0d] shadow-2xl flex flex-col lg:border lg:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Colección de {otherUserName}
            </h2>
            <p className="text-sm text-gray-400">
              {total} carta{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-800 space-y-3">
          {/* Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-mtg-green-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
                (condition || foil || rarity || colors.length > 0)
                  ? 'border-mtg-green-500 bg-mtg-green-500/10 text-mtg-green-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {showFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-mtg-green-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg space-y-3">
              {/* Color filters */}
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => {
                        setColors(prev =>
                          prev.includes(color.id)
                            ? prev.filter(c => c !== color.id)
                            : [...prev, color.id]
                        )
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all border-2 ${
                        colors.includes(color.id)
                          ? 'border-mtg-green-500 ring-2 ring-mtg-green-500/50'
                          : 'border-gray-700 opacity-50 hover:opacity-100'
                      }`}
                    >
                      {color.id === 'C' ? (
                        <span className="text-gray-400 text-lg">◇</span>
                      ) : (
                        color.symbol
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                    Condición
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-mtg-green-500"
                  >
                    {CONDITIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                    Foil
                  </label>
                  <select
                    value={foil}
                    onChange={(e) => setFoil(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-mtg-green-500"
                  >
                    {FOIL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                    Rareza
                  </label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-mtg-green-500"
                  >
                    {RARITIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear filters */}
              {(condition || foil || rarity || colors.length > 0) && (
                <button
                  onClick={() => {
                    setCondition('')
                    setFoil('')
                    setRarity('')
                    setColors([])
                  }}
                  className="text-sm text-mtg-green-400 hover:text-mtg-green-300 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-mtg-green-500" />
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">
                {debouncedSearch
                  ? 'No se encontraron cartas con ese nombre'
                  : 'No hay cartas en la colección'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {cards.map((card) => (
                <div
                  key={card.collectionId}
                  className={`relative group rounded-lg overflow-hidden bg-gray-900/50 border transition-colors ${
                    card.alreadyInTrade
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {/* Card image */}
                  <div className="aspect-[2.5/3.5] relative">
                    {card.cardImageUri || card.cardImageUriSmall ? (
                      <Image
                        src={(card.cardImageUriSmall || card.cardImageUri)!}
                        alt={card.cardName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                        Sin imagen
                      </div>
                    )}

                    {/* Overlay with action button */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      {card.alreadyInTrade ? (
                        <div className="bg-green-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          En el trade
                        </div>
                      ) : (
                        <button
                          onClick={() => addCardToTrade(card.collectionId)}
                          disabled={addingCard === card.collectionId}
                          className="opacity-0 group-hover:opacity-100 bg-mtg-green-600 hover:bg-mtg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {addingCard === card.collectionId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          Agregar
                        </button>
                      )}
                    </div>

                    {/* Foil badge */}
                    {card.isFoil && (
                      <div className="absolute top-1 right-1 bg-purple-500/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Foil
                      </div>
                    )}
                  </div>

                  {/* Card info */}
                  <div className="p-2">
                    <h3 className="text-xs font-medium text-gray-200 truncate" title={card.cardName}>
                      {card.cardName}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500">
                        {card.cardSetCode.toUpperCase()} • {card.condition}
                      </span>
                      {card.askingPrice !== null && (
                        <span className="text-xs font-medium text-green-400">
                          ${card.askingPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {card.quantity > 1 && (
                      <span className="text-[10px] text-gray-500">
                        x{card.quantity} disponibles
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="btn-secondary flex items-center gap-1 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-sm text-gray-400">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="btn-secondary flex items-center gap-1 text-sm disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
