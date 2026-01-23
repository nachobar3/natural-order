import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cardData = await request.json()

    // Validate required fields
    if (!cardData.scryfall_id || !cardData.oracle_id || !cardData.name) {
      return NextResponse.json(
        { error: 'Missing required card fields' },
        { status: 400 }
      )
    }

    // Upsert the card (insert or update if exists)
    const { data: card, error } = await supabase
      .from('cards')
      .upsert(
        {
          scryfall_id: cardData.scryfall_id,
          oracle_id: cardData.oracle_id,
          name: cardData.name,
          set_code: cardData.set_code,
          set_name: cardData.set_name,
          collector_number: cardData.collector_number,
          image_uri: cardData.image_uri,
          image_uri_small: cardData.image_uri_small,
          prices_usd: cardData.prices_usd,
          prices_usd_foil: cardData.prices_usd_foil,
          rarity: cardData.rarity,
          type_line: cardData.type_line,
          mana_cost: cardData.mana_cost,
          colors: cardData.colors,
          color_identity: cardData.color_identity,
          cmc: cardData.cmc,
          legalities: cardData.legalities,
          released_at: cardData.released_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'scryfall_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Card upsert error:', error)
      return NextResponse.json(
        { error: 'Failed to save card' },
        { status: 500 }
      )
    }

    return NextResponse.json({ card })
  } catch (error) {
    console.error('Card upsert error:', error)
    return NextResponse.json(
      { error: 'Failed to save card' },
      { status: 500 }
    )
  }
}
