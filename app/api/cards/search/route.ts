import { NextRequest, NextResponse } from 'next/server'
import type { ScryfallCard } from '@/types/database'

export const dynamic = 'force-dynamic'

const SCRYFALL_API = 'https://api.scryfall.com'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const page = searchParams.get('page') || '1'

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }

  try {
    // Use Scryfall's autocomplete for quick suggestions (max 20 results)
    const autocompleteUrl = `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`
    const autocompleteRes = await fetch(autocompleteUrl)

    if (!autocompleteRes.ok) {
      throw new Error('Scryfall API error')
    }

    const autocompleteData = await autocompleteRes.json()

    // If we have autocomplete results, get full card data for first few matches
    if (autocompleteData.data && autocompleteData.data.length > 0) {
      // Search for actual card data with the query (exclude digital-only printings)
      const searchUrl = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}+-is:digital&page=${page}&unique=prints`
      const searchRes = await fetch(searchUrl)

      if (searchRes.status === 404) {
        // No results found
        return NextResponse.json({
          cards: [],
          suggestions: autocompleteData.data,
          has_more: false,
          total_cards: 0,
        })
      }

      if (!searchRes.ok) {
        throw new Error('Scryfall search API error')
      }

      const searchData = await searchRes.json()

      // Transform Scryfall data to our format
      const cards = searchData.data.map((card: ScryfallCard) => ({
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
        finishes: card.finishes || ['nonfoil', 'foil'], // Default to both if not specified
        rarity: card.rarity,
        type_line: card.type_line,
        mana_cost: card.mana_cost || null,
        colors: card.colors || [],
        color_identity: card.color_identity || [],
        cmc: card.cmc,
        legalities: card.legalities,
        released_at: card.released_at,
      }))

      // Cache card search results for 5 minutes (data from Scryfall doesn't change often)
      return NextResponse.json({
        cards,
        suggestions: autocompleteData.data,
        has_more: searchData.has_more || false,
        total_cards: searchData.total_cards || cards.length,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      })
    }

    return NextResponse.json({
      cards: [],
      suggestions: [],
      has_more: false,
      total_cards: 0,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Card search error:', error)
    return NextResponse.json(
      { error: 'Failed to search cards' },
      { status: 500 }
    )
  }
}
