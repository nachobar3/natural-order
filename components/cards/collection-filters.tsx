'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react'

// Color symbols for MTG
const COLORS = [
  { id: 'W', label: 'Blanco', symbol: '⚪', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { id: 'U', label: 'Azul', symbol: '🔵', bg: 'bg-blue-500', border: 'border-blue-400' },
  { id: 'B', label: 'Negro', symbol: '⚫', bg: 'bg-gray-800', border: 'border-gray-600' },
  { id: 'R', label: 'Rojo', symbol: '🔴', bg: 'bg-red-500', border: 'border-red-400' },
  { id: 'G', label: 'Verde', symbol: '🟢', bg: 'bg-green-500', border: 'border-green-400' },
  { id: 'C', label: 'Incoloro', symbol: '◇', bg: 'bg-gray-400', border: 'border-gray-300' },
]

const CARD_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'Creature', label: 'Criatura' },
  { value: 'Instant', label: 'Instantáneo' },
  { value: 'Sorcery', label: 'Conjuro' },
  { value: 'Enchantment', label: 'Encantamiento' },
  { value: 'Artifact', label: 'Artefacto' },
  { value: 'Planeswalker', label: 'Planeswalker' },
  { value: 'Land', label: 'Tierra' },
]

const RARITIES = [
  { value: '', label: 'Todas las rarezas' },
  { value: 'mythic', label: 'Mítica' },
  { value: 'rare', label: 'Rara' },
  { value: 'uncommon', label: 'Infrecuente' },
  { value: 'common', label: 'Común' },
]

const CONDITIONS = [
  { value: '', label: 'Todas las condiciones' },
  { value: 'NM', label: 'Near Mint' },
  { value: 'LP', label: 'Lightly Played' },
  { value: 'MP', label: 'Moderately Played' },
  { value: 'HP', label: 'Heavily Played' },
  { value: 'DMG', label: 'Damaged' },
]

const FOIL_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'foil', label: 'Solo foil' },
  { value: 'non-foil', label: 'Solo no-foil' },
]

const SORT_OPTIONS_COLLECTION = [
  { value: 'date-desc', label: 'Más recientes' },
  { value: 'date-asc', label: 'Más antiguos' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'cmc-asc', label: 'CMC menor' },
  { value: 'cmc-desc', label: 'CMC mayor' },
]

const SORT_OPTIONS_WISHLIST = [
  { value: 'priority-desc', label: 'Mayor prioridad' },
  { value: 'priority-asc', label: 'Menor prioridad' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'date-desc', label: 'Más recientes' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'high', label: 'Alta (8-10)' },
  { value: 'medium', label: 'Media (4-7)' },
  { value: 'low', label: 'Baja (1-3)' },
]

const PAUSED_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Solo activas' },
  { value: 'paused', label: 'Solo pausadas' },
]

export interface FilterState {
  colors: string[]
  type: string
  rarity: string
  condition: string
  foil: string
  paused: string // collection only
  priority: string // wishlist only
  search: string
}

export interface SortState {
  value: string
}

interface CollectionFiltersProps {
  mode: 'collection' | 'wishlist'
  filters: FilterState
  sort: SortState
  onFiltersChange: (filters: FilterState) => void
  onSortChange: (sort: SortState) => void
  totalItems: number
  filteredItems: number
}

export function CollectionFilters({
  mode,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  totalItems,
  filteredItems,
}: CollectionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sortOptions = mode === 'collection' ? SORT_OPTIONS_COLLECTION : SORT_OPTIONS_WISHLIST

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.colors.length > 0) count++
    if (filters.type) count++
    if (filters.rarity) count++
    if (filters.condition) count++
    if (filters.foil) count++
    if (filters.paused) count++
    if (filters.priority) count++
    if (filters.search) count++
    return count
  }, [filters])

  const toggleColor = (colorId: string) => {
    const newColors = filters.colors.includes(colorId)
      ? filters.colors.filter(c => c !== colorId)
      : [...filters.colors, colorId]
    onFiltersChange({ ...filters, colors: newColors })
  }

  const clearFilters = () => {
    onFiltersChange({
      colors: [],
      type: '',
      rarity: '',
      condition: '',
      foil: '',
      paused: '',
      priority: '',
      search: '',
    })
  }

  const isFiltered = totalItems !== filteredItems

  return (
    <div className="space-y-3">
      {/* Top bar: Filter button + Sort */}
      <div className="flex items-center gap-2">
        {/* Filter toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            activeFilterCount > 0
              ? 'border-mtg-green-500 bg-mtg-green-500/10 text-mtg-green-400'
              : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm font-medium">
            Filtros{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Sort dropdown */}
        <select
          value={sort.value}
          onChange={(e) => onSortChange({ value: e.target.value })}
          className="input py-2 px-3 text-sm min-w-[160px]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expanded filters panel */}
      {isExpanded && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-4 animate-fade-in">
          {/* Search by name */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
              Buscar por nombre
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                placeholder="Ej: Lightning Bolt..."
                className="input w-full py-2 text-sm pr-8"
              />
              {filters.search && (
                <button
                  onClick={() => onFiltersChange({ ...filters, search: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Color filters */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => toggleColor(color.id)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all border-2 ${
                    filters.colors.includes(color.id)
                      ? `${color.border} ring-2 ring-mtg-green-500 ring-offset-2 ring-offset-gray-900`
                      : 'border-gray-700 opacity-50 hover:opacity-100'
                  }`}
                  title={color.label}
                >
                  {color.id === 'C' ? (
                    <span className="text-gray-400 text-xl">◇</span>
                  ) : (
                    color.symbol
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdowns row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Type */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
                className="input py-2 text-sm w-full"
              >
                {CARD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rarity */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                Rareza
              </label>
              <select
                value={filters.rarity}
                onChange={(e) => onFiltersChange({ ...filters, rarity: e.target.value })}
                className="input py-2 text-sm w-full"
              >
                {RARITIES.map((rarity) => (
                  <option key={rarity.value} value={rarity.value}>
                    {rarity.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                {mode === 'collection' ? 'Condición' : 'Condición mín.'}
              </label>
              <select
                value={filters.condition}
                onChange={(e) => onFiltersChange({ ...filters, condition: e.target.value })}
                className="input py-2 text-sm w-full"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Foil */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                Foil
              </label>
              <select
                value={filters.foil}
                onChange={(e) => onFiltersChange({ ...filters, foil: e.target.value })}
                className="input py-2 text-sm w-full"
              >
                {FOIL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection-specific: Paused */}
            {mode === 'collection' && (
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                  Estado
                </label>
                <select
                  value={filters.paused}
                  onChange={(e) => onFiltersChange({ ...filters, paused: e.target.value })}
                  className="input py-2 text-sm w-full"
                >
                  {PAUSED_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Wishlist-specific: Priority */}
            {mode === 'wishlist' && (
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                  Prioridad
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
                  className="input py-2 text-sm w-full"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Clear filters button */}
          {activeFilterCount > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
              <span className="text-sm text-gray-500">
                {isFiltered && `Mostrando ${filteredItems} de ${totalItems}`}
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-mtg-green-400 hover:text-mtg-green-300 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter summary when collapsed but filters active */}
      {!isExpanded && activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>
            Mostrando {filteredItems} de {totalItems}
          </span>
          <button
            onClick={clearFilters}
            className="text-mtg-green-400 hover:text-mtg-green-300 underline"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}

// Helper function to apply filters to collection items
export function applyCollectionFilters<T extends {
  cards: {
    name: string
    colors: string[] | null
    type_line: string | null
    rarity: string | null
    prices_usd: number | null
    prices_usd_foil: number | null
    cmc: number | null
  }
  condition?: string
  min_condition?: string
  foil?: boolean
  foil_preference?: string
  is_paused?: boolean
  priority?: number
  created_at?: string
  price_percentage?: number
  price_fixed?: number | null
  price_mode?: string
}>(
  items: T[],
  filters: FilterState,
  sort: SortState,
  mode: 'collection' | 'wishlist',
  calculatePrice?: (item: T) => number | null
): T[] {
  let filtered = [...items]

  // Search filter
  if (filters.search) {
    const search = filters.search.toLowerCase()
    filtered = filtered.filter(item =>
      item.cards.name.toLowerCase().includes(search)
    )
  }

  // Color filter
  if (filters.colors.length > 0) {
    filtered = filtered.filter(item => {
      const cardColors = item.cards.colors || []
      if (filters.colors.includes('C')) {
        // Colorless: no colors
        if (cardColors.length === 0) return true
      }
      return filters.colors.some(c => c !== 'C' && cardColors.includes(c))
    })
  }

  // Type filter
  if (filters.type) {
    filtered = filtered.filter(item =>
      item.cards.type_line?.toLowerCase().includes(filters.type.toLowerCase())
    )
  }

  // Rarity filter
  if (filters.rarity) {
    filtered = filtered.filter(item =>
      item.cards.rarity === filters.rarity
    )
  }

  // Condition filter
  if (filters.condition) {
    if (mode === 'collection') {
      filtered = filtered.filter(item => item.condition === filters.condition)
    } else {
      filtered = filtered.filter(item => item.min_condition === filters.condition)
    }
  }

  // Foil filter
  if (filters.foil) {
    if (mode === 'collection') {
      filtered = filtered.filter(item =>
        filters.foil === 'foil' ? item.foil : !item.foil
      )
    } else {
      filtered = filtered.filter(item => {
        if (filters.foil === 'foil') return item.foil_preference === 'foil_only'
        if (filters.foil === 'non-foil') return item.foil_preference === 'non_foil'
        return true
      })
    }
  }

  // Collection-specific: Paused filter
  if (mode === 'collection' && filters.paused) {
    filtered = filtered.filter(item =>
      filters.paused === 'paused' ? item.is_paused : !item.is_paused
    )
  }

  // Wishlist-specific: Priority filter
  if (mode === 'wishlist' && filters.priority) {
    filtered = filtered.filter(item => {
      const p = item.priority || 5
      if (filters.priority === 'high') return p >= 8
      if (filters.priority === 'medium') return p >= 4 && p <= 7
      if (filters.priority === 'low') return p <= 3
      return true
    })
  }

  // Sorting
  filtered.sort((a, b) => {
    switch (sort.value) {
      case 'price-desc': {
        const priceA = calculatePrice ? calculatePrice(a) : (a.cards.prices_usd || 0)
        const priceB = calculatePrice ? calculatePrice(b) : (b.cards.prices_usd || 0)
        return (priceB || 0) - (priceA || 0)
      }
      case 'price-asc': {
        const priceA = calculatePrice ? calculatePrice(a) : (a.cards.prices_usd || 0)
        const priceB = calculatePrice ? calculatePrice(b) : (b.cards.prices_usd || 0)
        return (priceA || 0) - (priceB || 0)
      }
      case 'name-asc':
        return a.cards.name.localeCompare(b.cards.name)
      case 'name-desc':
        return b.cards.name.localeCompare(a.cards.name)
      case 'cmc-asc':
        return (a.cards.cmc || 0) - (b.cards.cmc || 0)
      case 'cmc-desc':
        return (b.cards.cmc || 0) - (a.cards.cmc || 0)
      case 'date-asc':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      case 'date-desc':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      case 'priority-desc':
        return (b.priority || 5) - (a.priority || 5)
      case 'priority-asc':
        return (a.priority || 5) - (b.priority || 5)
      default:
        return 0
    }
  })

  return filtered
}

// Default filter state
export const defaultFilters: FilterState = {
  colors: [],
  type: '',
  rarity: '',
  condition: '',
  foil: '',
  paused: '',
  priority: '',
  search: '',
}

// Default sort state
export const defaultCollectionSort: SortState = { value: 'date-desc' }
export const defaultWishlistSort: SortState = { value: 'priority-desc' }
