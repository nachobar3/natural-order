import { NextRequest, NextResponse } from 'next/server'

const SCRYFALL_API = 'https://api.scryfall.com'

interface CardToMatch {
  name: string
  setCode: string | null
  collectorNumber: string | null
}

interface MatchedCard {
  index: number
  match: {
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
  } | null
  error: string | null
}

// Rate limiting: Scryfall allows 10 req/s, we'll be conservative
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  try {
    const { cards } = await request.json() as { cards: CardToMatch[] }

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'Cards array is required' }, { status: 400 })
    }

    // Limit batch size to 500 cards per request
    if (cards.length > 500) {
      return NextResponse.json(
        { error: 'Máximo 500 cartas por lote' },
        { status: 400 }
      )
    }

    // Use Scryfall's /cards/collection endpoint for batch matching
    // It accepts up to 75 identifiers per request
    const SCRYFALL_BATCH_SIZE = 75
    const results: MatchedCard[] = new Array(cards.length)

    // Initialize all results as not found
    for (let i = 0; i < cards.length; i++) {
      results[i] = { index: i, match: null, error: null }
    }

    // Process in batches of 75 (Scryfall limit)
    for (let batchStart = 0; batchStart < cards.length; batchStart += SCRYFALL_BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + SCRYFALL_BATCH_SIZE, cards.length)
      const batch = cards.slice(batchStart, batchEnd)

      // Build identifiers for Scryfall collection endpoint
      const identifiers = batch.map((card, idx) => {
        const globalIndex = batchStart + idx

        // Prefer set + collector_number for exact match
        if (card.setCode && card.collectorNumber) {
          return {
            _index: globalIndex,
            set: card.setCode.toLowerCase(),
            collector_number: card.collectorNumber,
          }
        }

        // Fallback to name + set
        if (card.setCode) {
          return {
            _index: globalIndex,
            name: card.name,
            set: card.setCode.toLowerCase(),
          }
        }

        // Fallback to just name (will get most recent printing)
        return {
          _index: globalIndex,
          name: card.name,
        }
      })

      // Rate limiting between batches
      if (batchStart > 0) {
        await delay(100)
      }

      try {
        // Strip _index before sending to Scryfall
        const scryfallIdentifiers = identifiers.map(({ _index, ...rest }) => rest)

        const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ identifiers: scryfallIdentifiers }),
        })

        if (!response.ok) {
          // If batch fails, mark all cards in batch as error
          for (let i = batchStart; i < batchEnd; i++) {
            results[i] = {
              index: i,
              match: null,
              error: `Error de Scryfall: ${response.status}`,
            }
          }
          continue
        }

        const data = await response.json()

        // Process found cards
        // Scryfall returns cards in same order as identifiers (for found ones)
        // and a not_found array for unfound ones
        const foundCards = data.data || []
        const notFound = data.not_found || []

        // Create a map of found cards by their identifier
        // We need to match them back to original indices
        const matchedIndices = new Set<number>()

        // Match found cards to original indices
        for (const foundCard of foundCards) {
          // Skip digital cards
          if (foundCard.digital) continue

          // Find which original card this matches
          for (let i = 0; i < identifiers.length; i++) {
            const identifier = identifiers[i]
            const globalIndex = identifier._index

            // Skip already matched
            if (matchedIndices.has(globalIndex)) continue

            // Check if this card matches the identifier
            const isMatch = matchCard(foundCard, identifier, cards[globalIndex - batchStart])

            if (isMatch) {
              matchedIndices.add(globalIndex)
              results[globalIndex] = {
                index: globalIndex,
                match: transformCard(foundCard),
                error: null,
              }
              break
            }
          }
        }

        // Mark unmatched cards in this batch
        for (let i = 0; i < identifiers.length; i++) {
          const globalIndex = identifiers[i]._index
          if (!matchedIndices.has(globalIndex)) {
            const originalCard = cards[globalIndex]
            results[globalIndex] = {
              index: globalIndex,
              match: null,
              error: `Carta no encontrada: "${originalCard.name}"`,
            }
          }
        }

      } catch (err) {
        // Network error - mark all cards in batch as error
        for (let i = batchStart; i < batchEnd; i++) {
          results[i] = {
            index: i,
            match: null,
            error: `Error de red: ${err instanceof Error ? err.message : 'Unknown'}`,
          }
        }
      }
    }

    // Second pass: try individual search for cards that weren't found
    // (in case of name mismatches or special characters)
    const notFoundIndices = results
      .filter(r => r.match === null && !r.error?.includes('Error de red'))
      .map(r => r.index)

    // Only do individual lookups for a limited number of failures
    const MAX_INDIVIDUAL_LOOKUPS = 50
    const toRetry = notFoundIndices.slice(0, MAX_INDIVIDUAL_LOOKUPS)

    for (let i = 0; i < toRetry.length; i++) {
      const cardIndex = toRetry[i]
      const card = cards[cardIndex]

      // Rate limiting
      if (i > 0) {
        await delay(100)
      }

      try {
        // Try search endpoint as fallback
        const query = `!"${card.name}" -is:digital`
        const searchUrl = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`
        const res = await fetch(searchUrl)

        if (res.ok) {
          const searchData = await res.json()
          if (searchData.data && searchData.data.length > 0) {
            // Find best match (prefer matching set if available)
            let bestMatch = searchData.data[0]
            if (card.setCode) {
              const setMatch = searchData.data.find(
                (c: { set: string }) => c.set.toLowerCase() === card.setCode!.toLowerCase()
              )
              if (setMatch) bestMatch = setMatch
            }

            results[cardIndex] = {
              index: cardIndex,
              match: transformCard(bestMatch),
              error: card.setCode && bestMatch.set.toLowerCase() !== card.setCode.toLowerCase()
                ? `Set "${card.setCode}" no encontrado, usando ${bestMatch.set.toUpperCase()}`
                : null,
            }
          }
        }
      } catch {
        // Individual lookup failed, keep original error
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Bulk match error:', error)
    return NextResponse.json(
      { error: 'Error al procesar las cartas' },
      { status: 500 }
    )
  }
}

// Check if a found card matches the original identifier
function matchCard(
  foundCard: { name: string; set: string; collector_number: string },
  identifier: { _index: number; set?: string; collector_number?: string; name?: string },
  originalCard: CardToMatch
): boolean {
  // If we searched by collector number, match by that
  if (identifier.collector_number && identifier.set) {
    return (
      foundCard.set.toLowerCase() === identifier.set.toLowerCase() &&
      foundCard.collector_number === identifier.collector_number
    )
  }

  // If we searched by name + set
  if (identifier.name && identifier.set) {
    return (
      foundCard.name.toLowerCase() === identifier.name.toLowerCase() &&
      foundCard.set.toLowerCase() === identifier.set.toLowerCase()
    )
  }

  // If we searched by name only
  if (identifier.name) {
    return foundCard.name.toLowerCase() === identifier.name.toLowerCase()
  }

  // Fallback: match by original card name
  return foundCard.name.toLowerCase() === originalCard.name.toLowerCase()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCard(card: any) {
  return {
    scryfall_id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    image_uri: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
    image_uri_small: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || null,
    prices_usd: card.prices.usd ? parseFloat(card.prices.usd) : null,
    prices_usd_foil: card.prices.usd_foil ? parseFloat(card.prices.usd_foil) : null,
    rarity: card.rarity,
    type_line: card.type_line,
    mana_cost: card.mana_cost || null,
    colors: card.colors || [],
    color_identity: card.color_identity || [],
    cmc: card.cmc,
    legalities: card.legalities,
    released_at: card.released_at,
  }
}
