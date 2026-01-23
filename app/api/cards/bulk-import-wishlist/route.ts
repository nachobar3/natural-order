import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    if (cards.length === 0) {
      return NextResponse.json({
        results: [],
        summary: { total: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 }
      })
    }

    const results: ImportResult[] = new Array(cards.length)
    const now = new Date().toISOString()

    // Step 1: Batch upsert all cards to the cards table
    const cardsToUpsert = cards.map(item => ({
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
      updated_at: now,
    }))

    const { error: upsertError } = await supabase
      .from('cards')
      .upsert(cardsToUpsert, { onConflict: 'scryfall_id' })

    if (upsertError) {
      console.error('Batch upsert error:', upsertError)
      for (let i = 0; i < cards.length; i++) {
        results[i] = {
          index: i,
          success: false,
          error: `Error al guardar cartas: ${upsertError.message}`,
          action: 'error',
        }
      }
      return NextResponse.json({
        results,
        summary: { total: cards.length, inserted: 0, updated: 0, skipped: 0, errors: cards.length }
      })
    }

    // Step 2: Get all card IDs by scryfall_id
    const scryfallIds = cards.map(c => c.card.scryfall_id)
    const { data: savedCards, error: fetchError } = await supabase
      .from('cards')
      .select('id, scryfall_id')
      .in('scryfall_id', scryfallIds)

    if (fetchError || !savedCards) {
      console.error('Fetch cards error:', fetchError)
      for (let i = 0; i < cards.length; i++) {
        results[i] = {
          index: i,
          success: false,
          error: 'Error al obtener IDs de cartas',
          action: 'error',
        }
      }
      return NextResponse.json({
        results,
        summary: { total: cards.length, inserted: 0, updated: 0, skipped: 0, errors: cards.length }
      })
    }

    // Create a map of scryfall_id to card_id
    const scryfallToCardId = new Map<string, string>()
    for (const card of savedCards) {
      scryfallToCardId.set(card.scryfall_id, card.id)
    }

    // Step 3: Check existing wishlist entries for all cards at once
    // Wishlist has UNIQUE(user_id, card_id), so we only need to check by card_id
    const cardIds = Array.from(new Set(
      cards.map(c => scryfallToCardId.get(c.card.scryfall_id)).filter(Boolean)
    )) as string[]

    const { data: existingEntries } = await supabase
      .from('wishlist')
      .select('id, card_id, quantity, foil_preference, min_condition')
      .eq('user_id', user.id)
      .in('card_id', cardIds)

    // Create a map of existing entries: card_id -> entry
    const existingMap = new Map<string, { id: string; quantity: number }>()
    for (const entry of existingEntries || []) {
      existingMap.set(entry.card_id, { id: entry.id, quantity: entry.quantity })
    }

    // Step 4: Categorize cards into insert, update, or skip
    const toInsert: { index: number; data: Record<string, unknown> }[] = []
    const toUpdate: { index: number; id: string; quantity: number; minCondition: string; foilPreference: string }[] = []

    for (let i = 0; i < cards.length; i++) {
      const item = cards[i]
      const cardId = scryfallToCardId.get(item.card.scryfall_id)

      if (!cardId) {
        results[i] = {
          index: i,
          success: false,
          error: 'No se encontró el ID de la carta',
          action: 'error',
        }
        continue
      }

      const existing = existingMap.get(cardId)

      if (existing) {
        // Handle conflict based on mode
        switch (conflictMode) {
          case 'skip':
            results[i] = {
              index: i,
              success: true,
              error: null,
              action: 'skipped',
            }
            break

          case 'update':
            toUpdate.push({
              index: i,
              id: existing.id,
              quantity: item.quantity,
              minCondition: item.minCondition,
              foilPreference: item.foilPreference,
            })
            break

          case 'add':
            toUpdate.push({
              index: i,
              id: existing.id,
              quantity: existing.quantity + item.quantity,
              minCondition: item.minCondition,
              foilPreference: item.foilPreference,
            })
            break
        }
      } else {
        // New entry
        toInsert.push({
          index: i,
          data: {
            user_id: user.id,
            card_id: cardId,
            quantity: item.quantity,
            min_condition: item.minCondition,
            foil_preference: item.foilPreference,
            edition_preference: 'any',
          },
        })
      }
    }

    // Step 5: Batch insert new entries
    if (toInsert.length > 0) {
      const insertData = toInsert.map(item => item.data)
      const { error: insertError } = await supabase
        .from('wishlist')
        .insert(insertData)

      if (insertError) {
        console.error('Batch insert error:', insertError)
        for (const item of toInsert) {
          results[item.index] = {
            index: item.index,
            success: false,
            error: `Error al insertar: ${insertError.message}`,
            action: 'error',
          }
        }
      } else {
        for (const item of toInsert) {
          results[item.index] = {
            index: item.index,
            success: true,
            error: null,
            action: 'inserted',
          }
        }
      }
    }

    // Step 6: Batch update existing entries (in parallel)
    if (toUpdate.length > 0) {
      const updatePromises = toUpdate.map(async (item) => {
        const { error: updateError } = await supabase
          .from('wishlist')
          .update({
            quantity: item.quantity,
            min_condition: item.minCondition,
            foil_preference: item.foilPreference,
          })
          .eq('id', item.id)

        return { index: item.index, error: updateError }
      })

      const updateResults = await Promise.all(updatePromises)

      for (const result of updateResults) {
        if (result.error) {
          results[result.index] = {
            index: result.index,
            success: false,
            error: `Error al actualizar: ${result.error.message}`,
            action: 'error',
          }
        } else {
          results[result.index] = {
            index: result.index,
            success: true,
            error: null,
            action: 'updated',
          }
        }
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
      fetch(new URL('/api/matches/compute', request.url).toString(), {
        method: 'POST',
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }).catch(err => console.error('Error triggering match recalculation:', err))
    }

    return NextResponse.json({ results, summary })
  } catch (error) {
    console.error('Bulk import wishlist error:', error)
    return NextResponse.json(
      { error: 'Error al importar cartas' },
      { status: 500 }
    )
  }
}
