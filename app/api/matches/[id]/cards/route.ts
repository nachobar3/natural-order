import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH - Toggle card exclusion
export async function PATCH(
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
    const { cardId, isExcluded } = body

    if (!cardId || typeof isExcluded !== 'boolean') {
      return NextResponse.json(
        { error: 'cardId e isExcluded son requeridos' },
        { status: 400 }
      )
    }

    // Verify user is part of this match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, status')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 })
    }

    // Don't allow modifications on completed/cancelled matches
    if (['completed', 'cancelled'].includes(match.status)) {
      return NextResponse.json(
        { error: 'No se puede modificar un trade finalizado' },
        { status: 400 }
      )
    }

    // Update card exclusion status
    const { error: updateError } = await supabase
      .from('match_cards')
      .update({ is_excluded: isExcluded })
      .eq('id', cardId)
      .eq('match_id', matchId)

    if (updateError) {
      console.error('Error updating card:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar carta' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Toggle card exclusion error:', error)
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}

// PUT - Bulk update card exclusions (for save operation)
export async function PUT(
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
    const { excludedCardIds } = body as { excludedCardIds: string[] }

    if (!Array.isArray(excludedCardIds)) {
      return NextResponse.json(
        { error: 'excludedCardIds debe ser un array' },
        { status: 400 }
      )
    }

    // Verify user is part of this match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, status, requested_by')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 })
    }

    // Don't allow modifications on completed/cancelled matches
    if (['completed', 'cancelled'].includes(match.status)) {
      return NextResponse.json(
        { error: 'No se puede modificar un trade finalizado' },
        { status: 400 }
      )
    }

    // Get all card IDs for this match
    const { data: matchCards } = await supabase
      .from('match_cards')
      .select('id')
      .eq('match_id', matchId)

    const allCardIds = matchCards?.map(c => c.id) || []

    // Reset all cards to not excluded
    if (allCardIds.length > 0) {
      await supabase
        .from('match_cards')
        .update({ is_excluded: false })
        .eq('match_id', matchId)
    }

    // Set excluded cards
    if (excludedCardIds.length > 0) {
      await supabase
        .from('match_cards')
        .update({ is_excluded: true })
        .eq('match_id', matchId)
        .in('id', excludedCardIds)
    }

    // Check if this invalidates a trade request from the other user
    const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id
    const wasRequestedByOther = match.requested_by === otherUserId && match.status === 'requested'

    // Mark match as user modified and update status if needed
    const updateData: Record<string, unknown> = {
      is_user_modified: true,
      updated_at: new Date().toISOString(),
    }

    // If the other user had requested the trade, invalidate it
    if (wasRequestedByOther) {
      updateData.status = 'active'
      updateData.requested_by = null
      updateData.requested_at = null
    }

    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)

    if (matchUpdateError) {
      console.error('Error updating match:', matchUpdateError)
    }

    // If trade request was invalidated, create notification for the other user
    if (wasRequestedByOther) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single()

      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'request_invalidated',
        match_id: matchId,
        from_user_id: user.id,
        content: `${currentUser?.display_name || 'Un usuario'} modificó el trade, tu solicitud fue cancelada`,
      })
    }

    // Calculate new values
    const { data: values } = await supabase.rpc('calculate_match_values', {
      p_match_id: matchId,
    })

    return NextResponse.json({
      success: true,
      requestInvalidated: wasRequestedByOther,
      values: values?.[0] || null,
    })
  } catch (error) {
    console.error('Save card exclusions error:', error)
    return NextResponse.json(
      { error: 'Error al guardar cambios' },
      { status: 500 }
    )
  }
}
