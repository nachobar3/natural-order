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
  minCondition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  foilPreference: 'any' | 'foil_only' | 'non_foil'
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

    console.log(`[bulk-import-wishlist] Processing ${cards.length} cards for user ${user.id}`)

    const results: ImportResult[] = []

    for (let i = 0; i < cards.length; i++) {
      const item = cards[i]

      console.log(`[bulk-import-wishlist] Processing card ${i + 1}: ${item.card?.name || 'unknown'}`)

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
          console.log(`[bulk-import-wishlist] Error saving card to cards table:`, cardError)
          results.push({
            index: i,
            success: false,
            error: `Error al guardar carta: ${cardError.message}`,
            action: 'error',
          })
          continue
        }

        console.log(`[bulk-import-wishlist] Card saved/found with id: ${savedCard.id}`)
        const cardId = savedCard.id

        // Check if this card already exists in user's wishlist
        // Wishlist has UNIQUE(user_id, card_id) constraint, so we match by those only
        const { data: existing } = await supabase
          .from('wishlist')
          .select('id, quantity, foil_preference, min_condition')
          .eq('user_id', user.id)
          .eq('card_id', cardId)
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
              // Update quantity and other fields
              const { error: updateError } = await supabase
                .from('wishlist')
                .update({
                  quantity: item.quantity,
                  min_condition: item.minCondition,
                  foil_preference: item.foilPreference,
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
                .from('wishlist')
                .update({
                  quantity: existing.quantity + item.quantity,
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

        // Insert new wishlist entry
        console.log(`[bulk-import-wishlist] Inserting new wishlist entry for card ${cardId}`)
        const { data: insertedData, error: insertError } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            card_id: cardId,
            quantity: item.quantity,
            min_condition: item.minCondition,
            foil_preference: item.foilPreference,
            edition_preference: 'any', // Default to any edition
          })
          .select()

        if (insertError) {
          console.log(`[bulk-import-wishlist] Insert error:`, insertError)
          results.push({
            index: i,
            success: false,
            error: `Error al insertar: ${insertError.message}`,
            action: 'error',
          })
        } else {
          console.log(`[bulk-import-wishlist] Successfully inserted:`, insertedData)
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

    console.log(`[bulk-import-wishlist] Import complete. Summary:`, summary)
    console.log(`[bulk-import-wishlist] Results:`, results)

    return NextResponse.json({ results, summary })
  } catch (error) {
    console.error('Bulk import wishlist error:', error)
    return NextResponse.json(
      { error: 'Error al importar cartas' },
      { status: 500 }
    )
  }
}
