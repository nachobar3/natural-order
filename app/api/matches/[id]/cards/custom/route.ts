import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST - Add a custom card from counterpart's collection to the trade
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id: matchId } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { collectionId, quantity = 1 } = body as { collectionId: string; quantity?: number }

    if (!collectionId) {
      return NextResponse.json(
        { error: 'collectionId es requerido' },
        { status: 400 }
      )
    }

    // Get the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id, status, requested_by')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Trade no encontrado' }, { status: 404 })
    }

    // Check if status allows adding cards
    if (!['active', 'contacted', 'dismissed'].includes(match.status)) {
      return NextResponse.json(
        { error: 'No se pueden agregar cartas en este estado del trade' },
        { status: 400 }
      )
    }

    const isUserA = match.user_a_id === user.id
    const otherUserId = isUserA ? match.user_b_id : match.user_a_id
    const direction = isUserA ? 'a_wants' : 'b_wants'

    // Get the collection item - must belong to the other user
    const { data: collectionItem, error: collectionError } = await supabase
      .from('collections')
      .select(`
        id,
        user_id,
        card_id,
        quantity,
        condition,
        foil,
        price_mode,
        price_percentage,
        price_fixed,
        cards (
          id,
          name,
          set_code,
          image_uri,
          prices_usd,
          prices_usd_foil
        )
      `)
      .eq('id', collectionId)
      .single()

    if (collectionError || !collectionItem) {
      return NextResponse.json(
        { error: 'Carta no encontrada en la colección' },
        { status: 404 }
      )
    }

    // Verify the collection belongs to the other user
    if (collectionItem.user_id !== otherUserId) {
      return NextResponse.json(
        { error: 'Esta carta no pertenece al otro usuario' },
        { status: 400 }
      )
    }

    // Check if card is already in trade (not excluded)
    const { data: existingCard } = await supabase
      .from('match_cards')
      .select('id, is_excluded')
      .eq('match_id', matchId)
      .eq('collection_id', collectionId)
      .eq('direction', direction)
      .single()

    if (existingCard) {
      if (!existingCard.is_excluded) {
        return NextResponse.json(
          { error: 'Esta carta ya está en el trade' },
          { status: 400 }
        )
      }
      // If it's excluded, just un-exclude it instead of creating a new one
      await supabase
        .from('match_cards')
        .update({ is_excluded: false })
        .eq('id', existingCard.id)

      return NextResponse.json({ success: true, action: 'unexcluded' })
    }

    // Validate quantity
    const actualQuantity = Math.min(quantity, collectionItem.quantity)
    if (actualQuantity <= 0) {
      return NextResponse.json(
        { error: 'Cantidad inválida' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const card = collectionItem.cards as any as {
      id: string
      name: string
      set_code: string
      image_uri: string | null
      prices_usd: number | null
      prices_usd_foil: number | null
    }

    // Calculate asking price
    let askingPrice: number | null = null
    if (collectionItem.price_mode === 'fixed' && collectionItem.price_fixed !== null) {
      askingPrice = collectionItem.price_fixed
    } else {
      const basePrice = collectionItem.foil ? card.prices_usd_foil : card.prices_usd
      if (basePrice !== null) {
        askingPrice = Math.round(basePrice * (collectionItem.price_percentage / 100) * 100) / 100
      }
    }

    // Insert the new match card
    const { error: insertError } = await supabase
      .from('match_cards')
      .insert({
        match_id: matchId,
        direction,
        wishlist_id: null,  // Custom cards don't have a wishlist entry
        collection_id: collectionId,
        card_id: collectionItem.card_id,
        card_name: card.name,
        card_set_code: card.set_code,
        card_image_uri: card.image_uri,
        asking_price: askingPrice,
        max_price: null,  // No max price for custom cards
        price_exceeds_max: false,
        collection_condition: collectionItem.condition,
        wishlist_min_condition: 'HP',  // Default to lowest standard
        is_foil: collectionItem.foil,
        quantity_available: collectionItem.quantity,
        quantity_wanted: actualQuantity,
        is_excluded: false,
        is_custom: true,
        added_by_user_id: user.id,
      })

    if (insertError) {
      console.error('Error inserting custom card:', insertError)
      return NextResponse.json(
        { error: 'Error al agregar carta' },
        { status: 500 }
      )
    }

    // Mark match as user-modified
    await supabase
      .from('matches')
      .update({
        is_user_modified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    // If there's a pending trade request, invalidate it
    if (match.requested_by && match.status === 'requested') {
      await supabase
        .from('matches')
        .update({
          status: 'contacted',
          requested_by: null,
          requested_at: null,
        })
        .eq('id', matchId)

      // Notify the requester that the request was invalidated
      await supabase.from('notifications').insert({
        user_id: match.requested_by,
        type: 'request_invalidated',
        match_id: matchId,
        from_user_id: user.id,
        content: 'El trade fue modificado, la solicitud anterior fue invalidada',
      })
    }

    return NextResponse.json({ success: true, action: 'added' })
  } catch (error) {
    console.error('Add custom card error:', error)
    return NextResponse.json(
      { error: 'Error al agregar carta' },
      { status: 500 }
    )
  }
}
