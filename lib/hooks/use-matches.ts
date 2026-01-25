'use client'

import useSWR from 'swr'
import type { Match } from '@/types/database'

// Filter categories mapping UI categories to DB statuses
type FilterCategory = 'disponibles' | 'activos' | 'confirmados' | 'realizados' | 'cancelados' | 'descartados'

const filterCategoryToStatuses: Record<FilterCategory, string[]> = {
  disponibles: ['active'],
  activos: ['contacted', 'requested'],
  confirmados: ['confirmed'],
  realizados: ['completed'],
  cancelados: ['cancelled'],
  descartados: ['dismissed'],
}

type SortOption = 'discount' | 'distance' | 'cards' | 'value' | 'score'

type CategoryCounts = Record<FilterCategory, number>

interface MatchesResponse {
  matches: Match[]
  counts: CategoryCounts
}

// SWR fetcher for matches
const matchesFetcher = async (url: string): Promise<MatchesResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al cargar trades')
  }
  return res.json()
}

interface UseMatchesOptions {
  filters: Set<FilterCategory>
  sortBy: SortOption
  enabled?: boolean
}

export function useMatches({ filters, sortBy, enabled = true }: UseMatchesOptions) {
  // Build the URL with the current filters and sort
  const dbStatuses = Array.from(filters).flatMap(cat => filterCategoryToStatuses[cat])
  const url = `/api/matches?status=${dbStatuses.join(',')}&counts=true&sort_by=${sortBy}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<MatchesResponse>(
    enabled ? url : null,
    matchesFetcher,
    {
      revalidateOnFocus: true, // Refresh data when user returns to the tab
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      keepPreviousData: true, // Keep showing old data while revalidating
    }
  )

  return {
    matches: data?.matches ?? [],
    counts: data?.counts ?? {
      disponibles: 0,
      activos: 0,
      confirmados: 0,
      realizados: 0,
      cancelados: 0,
      descartados: 0,
    },
    isLoading,
    isValidating,
    error: error as Error | undefined,
    mutate,
  }
}

// Optimistic update helpers
export function optimisticDismiss(
  currentData: MatchesResponse | undefined,
  matchId: string
): MatchesResponse | undefined {
  if (!currentData) return undefined

  return {
    matches: currentData.matches.filter(m => m.id !== matchId),
    counts: {
      ...currentData.counts,
      disponibles: Math.max(0, currentData.counts.disponibles - 1),
      descartados: currentData.counts.descartados + 1,
    },
  }
}

export function optimisticRestore(
  currentData: MatchesResponse | undefined,
  matchId: string
): MatchesResponse | undefined {
  if (!currentData) return undefined

  return {
    matches: currentData.matches.filter(m => m.id !== matchId),
    counts: {
      ...currentData.counts,
      descartados: Math.max(0, currentData.counts.descartados - 1),
      disponibles: currentData.counts.disponibles + 1,
    },
  }
}

// Export types
export type { FilterCategory, SortOption, CategoryCounts, MatchesResponse }
