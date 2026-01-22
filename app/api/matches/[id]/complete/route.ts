import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Mark trade as completed or not completed
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
    const { completed } = body as { completed: boolean }

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo "completed" es requerido' },
        { status: 400 }
      )
    }

    // Get the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 })
    }

    // Validate current status
    if (match.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Solo se puede marcar como completado un trade confirmado' },
        { status: 400 }
      )
    }

    const isUserA = match.user_a_id === user.id
    const otherUserId = isUserA ? match.user_b_id : match.user_a_id

    // Update the appropriate completion flag
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (isUserA) {
      updateData.user_a_completed = completed
    } else {
      updateData.user_b_completed = completed
    }

    // Get the other user's completion status
    const otherCompleted = isUserA ? match.user_b_completed : match.user_a_completed

    // Determine final status based on both users' responses
    let finalStatus: string | null = null
    let hasConflict = false

    if (otherCompleted !== null) {
      // Other user has already responded
      if (completed && otherCompleted) {
        // Both say completed
        finalStatus = 'completed'
      } else if (!completed && !otherCompleted) {
        // Both say not completed
        finalStatus = 'cancelled'
      } else {
        // Conflict: one says yes, other says no
        finalStatus = 'cancelled'
        hasConflict = true
      }
    }

    if (finalStatus) {
      updateData.status = finalStatus
      updateData.has_conflict = hasConflict
    }

    // Update match
    const { error: updateError } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)

    if (updateError) {
      console.error('Error updating match:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar trade' },
        { status: 500 }
      )
    }

    // If trade is finalized, handle the cards
    if (finalStatus === 'completed') {
      await handleTradeCompletion(supabase, matchId)
    }

    // Create notification for the other user
    const { data: currentUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const notificationContent = finalStatus === 'completed'
      ? `El trade con ${currentUser?.display_name || 'un usuario'} se completó exitosamente`
      : finalStatus === 'cancelled' && hasConflict
        ? `Hubo un conflicto en el trade con ${currentUser?.display_name || 'un usuario'}. El trade fue cancelado.`
        : finalStatus === 'cancelled'
          ? `El trade con ${currentUser?.display_name || 'un usuario'} fue cancelado`
          : completed
            ? `${currentUser?.display_name || 'Un usuario'} marcó el trade como realizado`
            : `${currentUser?.display_name || 'Un usuario'} marcó el trade como no realizado`

    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: finalStatus === 'completed' ? 'trade_completed' : finalStatus === 'cancelled' ? 'trade_cancelled' : 'trade_completed',
      match_id: matchId,
      from_user_id: user.id,
      content: notificationContent,
    })

    return NextResponse.json({
      success: true,
      finalStatus,
      hasConflict,
      waitingForOther: finalStatus === null,
    })
  } catch (error) {
    console.error('Complete trade error:', error)
    return NextResponse.json(
      { error: 'Error al completar trade' },
      { status: 500 }
    )
  }
}

// Handle the actual card movements when a trade is completed
async function handleTradeCompletion(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, matchId: string) {
  try {
    // Get the match with cards
    const { data: match } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id')
      .eq('id', matchId)
      .single()

    if (!match) return

    // Get active (non-excluded) match cards
    const { data: matchCards } = await supabase
      .from('match_cards')
      .select('collection_id, wishlist_id, direction, quantity_available, quantity_wanted')
      .eq('match_id', matchId)
      .eq('is_excluded', false)

    if (!matchCards || matchCards.length === 0) return

    // For each card in the trade:
    // 1. Reduce quantity in collection (or delete if quantity becomes 0)
    // 2. Reduce quantity in wishlist (or delete if quantity becomes 0)

    for (const card of matchCards) {
      // Handle collection - reduce or delete (skip if already processed/NULL)
      if (card.collection_id) {
        const { data: collectionItem } = await supabase
          .from('collections')
          .select('id, quantity')
          .eq('id', card.collection_id)
          .single()

        if (collectionItem) {
          const tradedQuantity = Math.min(card.quantity_available, card.quantity_wanted)
          const newQuantity = collectionItem.quantity - tradedQuantity

          if (newQuantity <= 0) {
            await supabase.from('collections').delete().eq('id', card.collection_id)
          } else {
            await supabase
              .from('collections')
              .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
              .eq('id', card.collection_id)
          }
        }
      }

      // Handle wishlist - reduce or delete (skip if already processed/NULL)
      if (card.wishlist_id) {
        const { data: wishlistItem } = await supabase
          .from('wishlist')
          .select('id, quantity')
          .eq('id', card.wishlist_id)
          .single()

        if (wishlistItem) {
          const tradedQuantity = Math.min(card.quantity_available, card.quantity_wanted)
          const newQuantity = wishlistItem.quantity - tradedQuantity

          if (newQuantity <= 0) {
            await supabase.from('wishlist').delete().eq('id', card.wishlist_id)
          } else {
            await supabase
              .from('wishlist')
              .update({ quantity: newQuantity })
              .eq('id', card.wishlist_id)
          }
        }
      }
    }

    console.log(`Trade ${matchId} completed - cards moved successfully`)
  } catch (error) {
    console.error('Error handling trade completion:', error)
    // Don't throw - the trade status is already updated
  }
}
