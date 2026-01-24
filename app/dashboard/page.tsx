'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  MapPin,
  Settings,
  Package,
  Heart,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
  ShoppingCart,
  Tag,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Archive,
  Clock,
  CheckCircle2,
  XOctagon,
  Inbox,
  MessageCircle,
  Handshake,
  SlidersHorizontal,
  History,
  ArrowUpDown,
  Percent,
  Ruler,
  Layers,
  DollarSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import type { Match, MatchType } from '@/types/database'

const matchTypeLabels: Record<MatchType, { label: string; icon: typeof ArrowRightLeft; color: string }> = {
  two_way: { label: 'Intercambio', icon: ArrowRightLeft, color: 'text-green-400 bg-green-500/20' },
  one_way_buy: { label: 'Compra', icon: ShoppingCart, color: 'text-blue-400 bg-blue-500/20' },
  one_way_sell: { label: 'Venta', icon: Tag, color: 'text-purple-400 bg-purple-500/20' },
}

// Filter categories mapping UI categories to DB statuses
type FilterCategory = 'disponibles' | 'activos' | 'confirmados' | 'realizados' | 'cancelados' | 'descartados'

const filterCategories: Record<FilterCategory, {
  label: string
  icon: typeof Inbox
  dbStatuses: string[]
  activeColor: string
  inactiveColor: string
}> = {
  disponibles: {
    label: 'Disponibles',
    icon: Inbox,
    dbStatuses: ['active'],
    activeColor: 'bg-blue-500 text-white border-blue-500',
    inactiveColor: 'bg-transparent text-blue-400 border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10',
  },
  activos: {
    label: 'Activos',
    icon: MessageCircle,
    dbStatuses: ['contacted', 'requested'],
    activeColor: 'bg-green-500 text-white border-green-500',
    inactiveColor: 'bg-transparent text-green-400 border-green-500/50 hover:border-green-500 hover:bg-green-500/10',
  },
  confirmados: {
    label: 'Confirmados',
    icon: Handshake,
    dbStatuses: ['confirmed'],
    activeColor: 'bg-yellow-500 text-black border-yellow-500',
    inactiveColor: 'bg-transparent text-yellow-400 border-yellow-500/50 hover:border-yellow-500 hover:bg-yellow-500/10',
  },
  realizados: {
    label: 'Realizados',
    icon: CheckCircle2,
    dbStatuses: ['completed'],
    activeColor: 'bg-gray-500 text-white border-gray-500',
    inactiveColor: 'bg-transparent text-gray-400 border-gray-500/50 hover:border-gray-500 hover:bg-gray-500/10',
  },
  cancelados: {
    label: 'Cancelados',
    icon: XOctagon,
    dbStatuses: ['cancelled'],
    activeColor: 'bg-red-500 text-white border-red-500',
    inactiveColor: 'bg-transparent text-red-400 border-red-500/50 hover:border-red-500 hover:bg-red-500/10',
  },
  descartados: {
    label: 'Descartados',
    icon: Archive,
    dbStatuses: ['dismissed'],
    activeColor: 'bg-gray-600 text-white border-gray-600',
    inactiveColor: 'bg-transparent text-gray-500 border-gray-600/50 hover:border-gray-600 hover:bg-gray-600/10',
  },
}

type CategoryCounts = Record<FilterCategory, number>

// Group definitions for simplified UI
type FilterGroup = 'pendientes' | 'historial'

const filterGroups: Record<FilterGroup, {
  label: string
  icon: typeof Inbox
  categories: FilterCategory[]
}> = {
  pendientes: {
    label: 'Pendientes',
    icon: Inbox,
    categories: ['disponibles', 'activos'],
  },
  historial: {
    label: 'Historial',
    icon: History,
    categories: ['confirmados', 'realizados', 'cancelados', 'descartados'],
  },
}

// Sorting options for matches
type SortOption = 'discount' | 'distance' | 'cards' | 'value' | 'score'

const sortOptions: Record<SortOption, {
  label: string
  icon: typeof Percent
  description: string
}> = {
  discount: {
    label: 'Mejor precio',
    icon: Percent,
    description: 'Mayor descuento primero',
  },
  distance: {
    label: 'Más cerca',
    icon: Ruler,
    description: 'Menor distancia primero',
  },
  cards: {
    label: 'Más cartas',
    icon: Layers,
    description: 'Más cartas en el trade',
  },
  value: {
    label: 'Mayor valor',
    icon: DollarSign,
    description: 'Mayor valor total USD',
  },
  score: {
    label: 'Relevancia',
    icon: ArrowUpDown,
    description: 'Mejor score general',
  },
}

interface SetupStatus {
  profile: boolean
  location: boolean
  preferences: boolean
  collection: boolean
  wishlist: boolean
}

interface Metrics {
  locationName: string | null
  collectionCount: number
  wishlistCount: number
  matchesCount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [setupExpanded, setSetupExpanded] = useState(true)
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    profile: false,
    location: false,
    preferences: false,
    collection: false,
    wishlist: false,
  })
  // metrics is used to display setup completion status
  const [, setMetrics] = useState<Metrics>({
    locationName: null,
    collectionCount: 0,
    wishlistCount: 0,
    matchesCount: 0,
  })

  // Matches state
  const [matches, setMatches] = useState<Match[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState<FilterGroup>('pendientes')
  const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(() => new Set<FilterCategory>(['disponibles', 'activos']))
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('discount')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    disponibles: 0,
    activos: 0,
    confirmados: 0,
    realizados: 0,
    cancelados: 0,
    descartados: 0,
  })

  const completedSteps = Object.values(setupStatus).filter(Boolean).length
  const totalSteps = Object.keys(setupStatus).length
  const isFullySetup = completedSteps === totalSteps
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  useEffect(() => {
    async function loadSetupStatus() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single()

      // Load location
      const { data: location } = await supabase
        .from('locations')
        .select('id, name, address')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      // Load preferences
      const { data: preferences } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Load collection count
      const { count: collectionCount } = await supabase
        .from('collections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Load wishlist count
      const { count: wishlistCount } = await supabase
        .from('wishlist')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setSetupStatus({
        profile: !!profile?.display_name,
        location: !!location,
        preferences: !!preferences,
        collection: (collectionCount || 0) > 0,
        wishlist: (wishlistCount || 0) > 0,
      })

      setMetrics({
        locationName: location?.address || location?.name || null,
        collectionCount: collectionCount || 0,
        wishlistCount: wishlistCount || 0,
        matchesCount: 0, // Will be updated when matches load
      })

      setLoading(false)
    }

    loadSetupStatus()
  }, [supabase])

  const loadMatches = useCallback(async (filters: Set<FilterCategory>, sort: SortOption) => {
    try {
      setMatchesLoading(true)

      // Map UI categories to DB statuses
      const dbStatuses = Array.from(filters).flatMap(cat => filterCategories[cat].dbStatuses)

      const res = await fetch(`/api/matches?status=${dbStatuses.join(',')}&counts=true&sort_by=${sort}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar trades')
      }
      const data = await res.json()
      setMatches(data.matches || [])

      // Update category counts
      if (data.counts) {
        setCategoryCounts(data.counts)
        // Update metrics with active matches count (disponibles + activos)
        setMetrics(prev => ({
          ...prev,
          matchesCount: (data.counts.disponibles || 0) + (data.counts.activos || 0)
        }))
      }

      setMatchError(null)
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setMatchesLoading(false)
    }
  }, [])

  const refreshMatches = async () => {
    setRefreshing(true)
    setMatchError(null)
    try {
      const res = await fetch('/api/matches/compute', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al calcular trades')
      }
      await loadMatches(activeFilters, sortBy)
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Error al refrescar')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    setSortDropdownOpen(false)
  }

  const switchGroup = (group: FilterGroup) => {
    setActiveGroup(group)
    setFiltersExpanded(false)
    // Set all categories in the group as active
    setActiveFilters(new Set<FilterCategory>(filterGroups[group].categories))
  }

  const toggleFilter = (category: FilterCategory) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev)
      if (newFilters.has(category)) {
        // Don't allow deselecting all filters within the group
        const groupCategories = filterGroups[activeGroup].categories
        const activeInGroup = groupCategories.filter(c => newFilters.has(c))
        if (activeInGroup.length > 1) {
          newFilters.delete(category)
        }
      } else {
        newFilters.add(category)
      }
      return newFilters
    })
  }

  // Calculate group counts
  const getGroupCount = (group: FilterGroup) => {
    return filterGroups[group].categories.reduce((sum, cat) => sum + categoryCounts[cat], 0)
  }

  const dismissMatch = async (matchId: string) => {
    // Optimistic update: remove immediately for instant feedback
    const previousMatches = matches
    const previousCounts = categoryCounts
    setMatches(prev => prev.filter(m => m.id !== matchId))
    setCategoryCounts(prev => ({
      ...prev,
      disponibles: Math.max(0, prev.disponibles - 1),
      descartados: prev.descartados + 1,
    }))
    setMetrics(prev => ({ ...prev, matchesCount: Math.max(0, prev.matchesCount - 1) }))

    trackEvent(AnalyticsEvents.MATCH_DISMISSED, { match_id: matchId })

    try {
      const res = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status: 'dismissed' }),
      })
      if (!res.ok) throw new Error('Failed to dismiss')
    } catch (err) {
      // Rollback on error
      setMatches(previousMatches)
      setCategoryCounts(previousCounts)
      console.error('Error dismissing match:', err)
    }
  }

  const restoreMatch = async (matchId: string) => {
    // Optimistic update: remove immediately for instant feedback
    const previousMatches = matches
    const previousCounts = categoryCounts
    setMatches(prev => prev.filter(m => m.id !== matchId))
    setCategoryCounts(prev => ({
      ...prev,
      descartados: Math.max(0, prev.descartados - 1),
      disponibles: prev.disponibles + 1,
    }))

    trackEvent(AnalyticsEvents.MATCH_RESTORED, { match_id: matchId })

    try {
      const res = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status: 'active' }),
      })
      if (!res.ok) throw new Error('Failed to restore')
    } catch (err) {
      // Rollback on error
      setMatches(previousMatches)
      setCategoryCounts(previousCounts)
      console.error('Error restoring match:', err)
    }
  }

  // Auto-compute trades on page load, then reload when filters or sort change
  useEffect(() => {
    // Only compute once when fully setup
    if (isFullySetup && activeFilters.has('disponibles')) {
      refreshMatches()
    } else {
      loadMatches(activeFilters, sortBy)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, sortBy, isFullySetup])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
      </div>
    )
  }

  const setupSteps = [
    { key: 'profile', label: 'Datos', icon: User, href: '/dashboard/profile', completed: setupStatus.profile },
    { key: 'location', label: 'Ubicación', icon: MapPin, href: '/dashboard/profile?tab=ubicacion', completed: setupStatus.location },
    { key: 'preferences', label: 'Preferencias', icon: Settings, href: '/dashboard/profile?tab=preferencias', completed: setupStatus.preferences },
    { key: 'collection', label: 'Colección', icon: Package, href: '/dashboard/collection', completed: setupStatus.collection },
    { key: 'wishlist', label: 'Wishlist', icon: Heart, href: '/dashboard/wishlist', completed: setupStatus.wishlist },
  ]

  return (
    <div className="space-y-6">
      {/* Setup checklist - Only show if not complete */}
      {!isFullySetup && (
        <div className="card">
          <button
            onClick={() => setSetupExpanded(!setupExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {/* Circular progress */}
              <div className="relative flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-mtg-green-900/30"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * progressPercent) / 100}
                    className="text-mtg-green-500"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-gray-200">{progressPercent}%</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-100">Configuración inicial</h3>
                <p className="text-xs text-gray-500">{completedSteps} de {totalSteps} pasos completados</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-mtg-green-400 text-sm font-medium">
              {setupExpanded ? (
                <>
                  <span>Colapsar</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Expandir</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </div>
          </button>

          {setupExpanded && (
            <div className="mt-4 pt-4 border-t border-mtg-green-900/30">
              {/* Horizontal steps for desktop */}
              <div className="hidden sm:flex items-center justify-between gap-2">
                {setupSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <Link
                        href={step.href}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 transition-colors ${
                          step.completed
                            ? 'text-mtg-green-400'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-mtg-green-900/20'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.completed
                            ? 'bg-mtg-green-500 text-white'
                            : 'border-2 border-gray-600'
                        }`}>
                          {step.completed ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-medium">{step.label}</span>
                      </Link>
                      {index < setupSteps.length - 1 && (
                        <div className={`h-0.5 w-full max-w-[40px] ${
                          step.completed ? 'bg-mtg-green-500' : 'bg-gray-700'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Vertical steps for mobile */}
              <div className="sm:hidden space-y-1">
                {setupSteps.map((step) => {
                  const Icon = step.icon
                  return (
                    <Link
                      key={step.key}
                      href={step.href}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        step.completed
                          ? 'text-mtg-green-400'
                          : 'text-gray-400 hover:bg-mtg-green-900/20'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-mtg-green-500 text-white'
                          : 'border-2 border-gray-600'
                      }`}>
                        {step.completed ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Icon className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-sm font-medium flex-1">{step.label}</span>
                      {!step.completed && (
                        <span className="text-xs text-mtg-green-400 font-medium">Completar</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trades section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Tus Trades</h2>
          <div className="flex items-center gap-2">
            {/* Sort dropdown - only show for pendientes */}
            {activeGroup === 'pendientes' && (
              <div className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {(() => {
                    const SortIcon = sortOptions[sortBy].icon
                    return <SortIcon className="w-4 h-4" />
                  })()}
                  <span className="hidden sm:inline">{sortOptions[sortBy].label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {sortDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSortDropdownOpen(false)}
                    />
                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 py-1">
                      {(Object.entries(sortOptions) as [SortOption, typeof sortOptions[SortOption]][]).map(([key, option]) => {
                        const OptionIcon = option.icon
                        const isSelected = sortBy === key

                        return (
                          <button
                            key={key}
                            onClick={() => handleSortChange(key)}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                              ${isSelected
                                ? 'bg-mtg-green-600/20 text-mtg-green-400'
                                : 'text-gray-300 hover:bg-gray-700/50'
                              }
                            `}
                          >
                            <OptionIcon className="w-4 h-4" />
                            <div className="flex-1">
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-gray-500">{option.description}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4" />}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refresh button */}
            {activeFilters.has('disponibles') && isFullySetup && (
              <button
                onClick={refreshMatches}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-300 rounded-lg transition-colors"
                title="Actualizar trades"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Simplified filter UI */}
        <div className="space-y-2">
          {/* Main toggle + filter button */}
          <div className="flex items-center gap-2">
            {/* Group toggle */}
            <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
              {(Object.entries(filterGroups) as [FilterGroup, typeof filterGroups[FilterGroup]][]).map(([key, group]) => {
                const isActive = activeGroup === key
                const count = getGroupCount(key)
                const Icon = group.icon

                return (
                  <button
                    key={key}
                    onClick={() => switchGroup(key)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-mtg-green-600 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{group.label}</span>
                    {count > 0 && (
                      <span className={`
                        ml-1 px-1.5 py-0.5 text-xs rounded-full
                        ${isActive ? 'bg-white/20' : 'bg-gray-700'}
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Expand filters button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filtersExpanded
                  ? 'bg-gray-700 text-gray-200'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }
              `}
              title="Filtros detallados"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {filtersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expanded filter pills */}
          {filtersExpanded && (
            <div className="flex flex-wrap gap-2 pl-1 pt-1 pb-1 border-l-2 border-gray-700 ml-2">
              {filterGroups[activeGroup].categories.map((key) => {
                const config = filterCategories[key]
                const Icon = config.icon
                const isActive = activeFilters.has(key)
                const count = categoryCounts[key]

                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                      border transition-all duration-200
                      ${isActive ? config.activeColor : config.inactiveColor}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{config.label}</span>
                    {count > 0 && (
                      <span className={`
                        ml-1 px-1.5 py-0.5 text-xs rounded-full
                        ${isActive ? 'bg-white/20' : 'bg-current/10'}
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Match error */}
        {matchError && (
          <div className="card bg-red-500/10 border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-400">Error</h3>
                <p className="text-sm text-red-300 mt-1">{matchError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Matches loading */}
        {matchesLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
          </div>
        )}

        {/* Empty state */}
        {!matchesLoading && !matchError && matches.length === 0 && (
          <div className="card text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No hay trades en esta vista
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {activeFilters.has('disponibles') && !isFullySetup
                ? 'Completá los pasos de configuración arriba para empezar a encontrar trades.'
                : activeFilters.has('disponibles')
                  ? 'No encontramos usuarios cercanos con cartas que coincidan. Agregá más cartas a tu colección o wishlist.'
                  : `No hay trades con los filtros seleccionados. Probá cambiando los filtros.`}
            </p>
          </div>
        )}

        {/* Match list */}
        {!matchesLoading && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((match) => {
              const typeInfo = matchTypeLabels[match.matchType]
              const TypeIcon = typeInfo.icon
              const valueDiff = (match.valueIWant || 0) - (match.valueTheyWant || 0)

              return (
                <div
                  key={match.id}
                  className="card hover:border-mtg-green-500/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-mtg-green-900/30">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
                      {match.otherUser.avatarUrl ? (
                        <img
                          src={match.otherUser.avatarUrl}
                          alt={match.otherUser.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-mtg-green-400">
                          {match.otherUser.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-100">
                          {match.otherUser.displayName}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${typeInfo.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                        {/* Status badge for non-active statuses */}
                        {match.status !== 'active' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            match.status === 'contacted' ? 'text-blue-400 bg-blue-500/20' :
                            match.status === 'requested' ? 'text-green-400 bg-green-500/20' :
                            match.status === 'confirmed' ? 'text-yellow-400 bg-yellow-500/20' :
                            match.status === 'completed' ? 'text-gray-400 bg-gray-500/20' :
                            match.status === 'cancelled' ? 'text-red-400 bg-red-500/20' :
                            match.status === 'dismissed' ? 'text-gray-500 bg-gray-600/20' :
                            'text-gray-400 bg-gray-500/20'
                          }`}>
                            {match.status === 'contacted' && <><MessageCircle className="w-3 h-3" />Contactado</>}
                            {match.status === 'requested' && <><Clock className="w-3 h-3" />Solicitado</>}
                            {match.status === 'confirmed' && <><Handshake className="w-3 h-3" />Confirmado</>}
                            {match.status === 'completed' && <><CheckCircle2 className="w-3 h-3" />Realizado</>}
                            {match.status === 'cancelled' && <><XOctagon className="w-3 h-3" />Cancelado</>}
                            {match.status === 'dismissed' && <><Archive className="w-3 h-3" />Descartado</>}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {match.distanceKm !== null && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {match.distanceKm < 1 ? '<1' : Math.round(match.distanceKm)} km
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dismiss/Restore button - only for active/dismissed status */}
                    {match.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          dismissMatch(match.id)
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Descartar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    {match.status === 'dismissed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreMatch(match.id)
                        }}
                        className="p-1.5 text-gray-500 hover:text-mtg-green-400 hover:bg-mtg-green-500/10 rounded-lg transition-colors"
                        title="Restaurar"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Cards table */}
                  <div className="grid grid-cols-2 gap-4 py-3">
                    {/* Cards they have (that I want) */}
                    <div>
                      <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        Tiene ({match.cardsIWant})
                      </h4>
                      <div className="space-y-1.5">
                        {match.cardsIWantList.length > 0 ? (
                          match.cardsIWantList.map((card, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-gray-300 truncate">{card.name}</span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {card.setCode.toUpperCase()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-600">-</span>
                        )}
                      </div>
                    </div>

                    {/* Cards I have (that they want) */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Busca ({match.cardsTheyWant})
                      </h4>
                      <div className="space-y-1.5">
                        {match.cardsTheyWantList.length > 0 ? (
                          match.cardsTheyWantList.map((card, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-gray-300 truncate">{card.name}</span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {card.setCode.toUpperCase()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-600">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-mtg-green-900/30">
                    <div className="flex items-center gap-3">
                      {match.hasPriceWarnings && (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Precio excedido
                        </span>
                      )}
                      {match.matchType === 'two_way' && (
                        <span className={`text-xs font-medium ${
                          Math.abs(valueDiff) < 1
                            ? 'text-green-400'
                            : valueDiff > 0
                              ? 'text-green-400'
                              : 'text-red-400'
                        }`}>
                          {Math.abs(valueDiff) < 1
                            ? 'Trade justo'
                            : valueDiff > 0
                              ? `+$${valueDiff.toFixed(2)} a favor`
                              : `-$${Math.abs(valueDiff).toFixed(2)} diferencia`}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/matches/${match.id}`)}
                      className="btn-primary text-sm py-1.5 px-4"
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        {!matchesLoading && matches.length > 0 && (
          <div className="card bg-gray-900/50">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Tipos de match:</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Intercambio:</span>
                <span className="text-gray-500">Ambos tienen cartas que el otro busca</span>
              </span>
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">Compra:</span>
                <span className="text-gray-500">Ellos tienen cartas que vos buscás</span>
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300">Venta:</span>
                <span className="text-gray-500">Vos tenés cartas que ellos buscan</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
