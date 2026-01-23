import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE - Remove a custom card from the trade
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cardId: string } }
) {
  try {
    const supabase = await createClient()
    const { id: matchId, cardId } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
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

    // Check if status allows removing cards
    if (!['active', 'contacted', 'dismissed'].includes(match.status)) {
      return NextResponse.json(
        { error: 'No se pueden eliminar cartas en este estado del trade' },
        { status: 400 }
      )
    }

    // Get the card to delete
    const { data: matchCard, error: cardError } = await supabase
      .from('match_cards')
      .select('id, is_custom, added_by_user_id')
      .eq('id', cardId)
      .eq('match_id', matchId)
      .single()

    if (cardError || !matchCard) {
      return NextResponse.json(
        { error: 'Carta no encontrada en el trade' },
        { status: 404 }
      )
    }

    // Only custom cards can be deleted - regular cards can only be excluded
    if (!matchCard.is_custom) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar cartas agregadas manualmente. Las cartas de wishlist solo se pueden excluir.' },
        { status: 400 }
      )
    }

    // Only the user who added the card can delete it
    if (matchCard.added_by_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Solo quien agregó la carta puede eliminarla' },
        { status: 403 }
      )
    }

    // Delete the card
    const { error: deleteError } = await supabase
      .from('match_cards')
      .delete()
      .eq('id', cardId)

    if (deleteError) {
      console.error('Error deleting custom card:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar carta' },
        { status: 500 }
      )
    }

    // Update match modified flag
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete custom card error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar carta' },
      { status: 500 }
    )
  }
}
