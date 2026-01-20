import { NextRequest, NextResponse } from 'next/server'
import type { ScryfallCard } from '@/types/database'

const SCRYFALL_API = 'https://api.scryfall.com'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const oracleId = searchParams.get('oracle_id')

  if (!oracleId) {
    return NextResponse.json(
      { error: 'oracle_id is required' },
      { status: 400 }
    )
  }

  try {
    // Fetch all printings using Scryfall's search with oracle_id
    // Exclude digital-only printings (MTGO, Arena-only sets)
    const searchUrl = `${SCRYFALL_API}/cards/search?q=oracle_id:${oracleId}+-is:digital&unique=prints&order=released&dir=desc`
    const searchRes = await fetch(searchUrl)

    if (searchRes.status === 404) {
      return NextResponse.json({ printings: [] })
    }

    if (!searchRes.ok) {
      throw new Error('Scryfall API error')
    }

    const searchData = await searchRes.json()

    // Transform Scryfall data to our format
    const printings = searchData.data.map((card: ScryfallCard) => ({
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
    }))

    return NextResponse.json({ printings })
  } catch (error) {
    console.error('Printings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch printings' },
      { status: 500 }
    )
  }
}
