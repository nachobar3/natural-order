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

    // Limit batch size
    if (cards.length > 100) {
      return NextResponse.json(
        { error: 'Máximo 100 cartas por lote' },
        { status: 400 }
      )
    }

    const results: MatchedCard[] = []

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]

      // Rate limiting - 100ms between requests
      if (i > 0) {
        await delay(100)
      }

      try {
        let searchUrl: string

        // If we have set code and collector number, use exact match
        if (card.setCode && card.collectorNumber) {
          searchUrl = `${SCRYFALL_API}/cards/${card.setCode.toLowerCase()}/${card.collectorNumber}`
          const res = await fetch(searchUrl)

          if (res.ok) {
            const data = await res.json()
            if (!data.digital) {
              results.push({
                index: i,
                match: transformCard(data),
                error: null,
              })
              continue
            }
          }
        }

        // Fallback to name search with optional set filter
        let query = `!"${card.name}" -is:digital`
        if (card.setCode) {
          query += ` set:${card.setCode.toLowerCase()}`
        }

        searchUrl = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`
        const res = await fetch(searchUrl)

        if (res.status === 404) {
          // Try without set filter
          if (card.setCode) {
            const fallbackQuery = `!"${card.name}" -is:digital`
            const fallbackUrl = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(fallbackQuery)}&unique=prints&order=released&dir=desc`
            const fallbackRes = await fetch(fallbackUrl)

            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json()
              if (fallbackData.data && fallbackData.data.length > 0) {
                results.push({
                  index: i,
                  match: transformCard(fallbackData.data[0]),
                  error: `Set "${card.setCode}" no encontrado, usando edición más reciente`,
                })
                continue
              }
            }
          }

          results.push({
            index: i,
            match: null,
            error: `Carta no encontrada: "${card.name}"`,
          })
          continue
        }

        if (!res.ok) {
          results.push({
            index: i,
            match: null,
            error: `Error de búsqueda: ${res.status}`,
          })
          continue
        }

        const data = await res.json()
        if (data.data && data.data.length > 0) {
          results.push({
            index: i,
            match: transformCard(data.data[0]),
            error: null,
          })
        } else {
          results.push({
            index: i,
            match: null,
            error: `Carta no encontrada: "${card.name}"`,
          })
        }
      } catch (err) {
        results.push({
          index: i,
          match: null,
          error: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
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
