import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CardToImport {
  card: {
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
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  foil: boolean
  notes: string | null
}

interface ImportResult {
  index: number
  success: boolean
  error: string | null
  action: 'inserted' | 'updated' | 'skipped' | 'error'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { cards, conflictMode } = await request.json() as {
      cards: CardToImport[]
      conflictMode: 'skip' | 'update' | 'add'
    }

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'Cards array is required' }, { status: 400 })
    }

    const results: ImportResult[] = []

    for (let i = 0; i < cards.length; i++) {
      const item = cards[i]

      try {
        // First, upsert the card to our cards table
        const { data: savedCard, error: cardError } = await supabase
          .from('cards')
          .upsert({
            scryfall_id: item.card.scryfall_id,
            oracle_id: item.card.oracle_id,
            name: item.card.name,
            set_code: item.card.set_code,
            set_name: item.card.set_name,
            collector_number: item.card.collector_number,
            image_uri: item.card.image_uri,
            image_uri_small: item.card.image_uri_small,
            prices_usd: item.card.prices_usd,
            prices_usd_foil: item.card.prices_usd_foil,
            rarity: item.card.rarity,
            type_line: item.card.type_line,
            mana_cost: item.card.mana_cost,
            colors: item.card.colors,
            color_identity: item.card.color_identity,
            cmc: item.card.cmc,
            legalities: item.card.legalities,
            released_at: item.card.released_at,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'scryfall_id',
          })
          .select('id')
          .single()

        if (cardError) {
          results.push({
            index: i,
            success: false,
            error: `Error al guardar carta: ${cardError.message}`,
            action: 'error',
          })
          continue
        }

        const cardId = savedCard.id

        // Check if this card already exists in user's collection with same condition and foil
        const { data: existing } = await supabase
          .from('collections')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('card_id', cardId)
          .eq('condition', item.condition)
          .eq('foil', item.foil)
          .single()

        if (existing) {
          // Handle conflict based on mode
          switch (conflictMode) {
            case 'skip':
              results.push({
                index: i,
                success: true,
                error: null,
                action: 'skipped',
              })
              continue

            case 'update':
              // Update quantity
              const { error: updateError } = await supabase
                .from('collections')
                .update({
                  quantity: item.quantity,
                  notes: item.notes,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

              if (updateError) {
                results.push({
                  index: i,
                  success: false,
                  error: `Error al actualizar: ${updateError.message}`,
                  action: 'error',
                })
              } else {
                results.push({
                  index: i,
                  success: true,
                  error: null,
                  action: 'updated',
                })
              }
              continue

            case 'add':
              // Add quantity to existing
              const { error: addError } = await supabase
                .from('collections')
                .update({
                  quantity: existing.quantity + item.quantity,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

              if (addError) {
                results.push({
                  index: i,
                  success: false,
                  error: `Error al sumar cantidad: ${addError.message}`,
                  action: 'error',
                })
              } else {
                results.push({
                  index: i,
                  success: true,
                  error: null,
                  action: 'updated',
                })
              }
              continue
          }
        }

        // Insert new collection entry
        const { error: insertError } = await supabase
          .from('collections')
          .insert({
            user_id: user.id,
            card_id: cardId,
            quantity: item.quantity,
            condition: item.condition,
            foil: item.foil,
            price_mode: 'percentage',
            price_percentage: 100,
            notes: item.notes,
          })

        if (insertError) {
          results.push({
            index: i,
            success: false,
            error: `Error al insertar: ${insertError.message}`,
            action: 'error',
          })
        } else {
          results.push({
            index: i,
            success: true,
            error: null,
            action: 'inserted',
          })
        }
      } catch (err) {
        results.push({
          index: i,
          success: false,
          error: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          action: 'error',
        })
      }
    }

    // Summary
    const summary = {
      total: results.length,
      inserted: results.filter(r => r.action === 'inserted').length,
      updated: results.filter(r => r.action === 'updated').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      errors: results.filter(r => r.action === 'error').length,
    }

    // Trigger match recalculation if any cards were imported
    if (summary.inserted > 0 || summary.updated > 0) {
      // Fire and forget - don't wait for matches to compute
      fetch(new URL('/api/matches/compute', request.url).toString(), {
        method: 'POST',
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }).catch(err => console.error('Error triggering match recalculation:', err))
    }

    return NextResponse.json({ results, summary })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Error al importar cartas' },
      { status: 500 }
    )
  }
}
