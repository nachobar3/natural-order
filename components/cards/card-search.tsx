'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useDebounce } from '@/lib/hooks/use-debounce'

interface CardSearchResult {
  scryfall_id: string
  oracle_id: string
  name: string
  set_code: string
  set_name: string
  collector_number: string | null
  image_uri: string | null
  image_uri_small: string | null
  prices_usd: number | null
  prices_usd_foil: number | null
  rarity: string | null
  type_line: string | null
  mana_cost: string | null
  colors: string[] | null
  color_identity: string[] | null
  cmc: number | null
  legalities: Record<string, string> | null
  released_at: string | null
}

interface CardSearchProps {
  onSelect: (card: CardSearchResult) => void
  placeholder?: string
}

export function CardSearch({ onSelect, placeholder = 'Buscar carta...' }: CardSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  const searchCards = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.cards || [])
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    searchCards(debouncedQuery)
  }, [debouncedQuery, searchCards])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  const handleSelect = (card: CardSearchResult) => {
    onSelect(card)
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative z-40">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="input pl-10 pr-10"
          placeholder={placeholder}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (results.length > 0 || suggestions.length > 0) && (
        <div
          ref={resultsRef}
          className="absolute z-[100] w-full mt-1 bg-mtg-dark border border-mtg-green-900/30 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        >
          {results.length > 0 ? (
            <ul className="py-2">
              {results.map((card, index) => (
                <li key={card.scryfall_id}>
                  <button
                    onClick={() => handleSelect(card)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-mtg-green-600/20'
                        : 'hover:bg-mtg-green-900/20'
                    }`}
                  >
                    {card.image_uri_small ? (
                      <Image
                        src={card.image_uri_small}
                        alt={card.name}
                        width={40}
                        height={56}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">
                        {card.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {card.set_name} ({card.set_code.toUpperCase()}) #{card.collector_number}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {card.prices_usd && (
                          <span className="text-xs text-mtg-green-400">
                            ${card.prices_usd.toFixed(2)}
                          </span>
                        )}
                        {card.rarity && (
                          <span className={`text-xs capitalize ${
                            card.rarity === 'mythic' ? 'text-orange-400' :
                            card.rarity === 'rare' ? 'text-yellow-400' :
                            card.rarity === 'uncommon' ? 'text-gray-300' :
                            'text-gray-500'
                          }`}>
                            {card.rarity}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : suggestions.length > 0 ? (
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 10).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-2 py-1 text-xs bg-mtg-green-900/30 text-gray-300 rounded hover:bg-mtg-green-900/50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
