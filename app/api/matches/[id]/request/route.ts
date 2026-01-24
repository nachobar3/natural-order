import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

// POST - Request a trade
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
    if (!['active', 'contacted', 'dismissed'].includes(match.status)) {
      return NextResponse.json(
        { error: `No se puede solicitar un trade en estado "${match.status}"` },
        { status: 400 }
      )
    }

    // Check that there are active (non-excluded) cards
    const { data: activeCards } = await supabase
      .from('match_cards')
      .select('id')
      .eq('match_id', matchId)
      .eq('is_excluded', false)

    if (!activeCards || activeCards.length === 0) {
      return NextResponse.json(
        { error: 'No hay cartas activas en el trade' },
        { status: 400 }
      )
    }

    const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id

    // Update match status
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'requested',
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        is_user_modified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('Error updating match:', updateError)
      return NextResponse.json(
        { error: 'Error al solicitar trade' },
        { status: 500 }
      )
    }

    // Create notification for the other user
    const { data: currentUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const notificationContent = `${currentUser?.display_name || 'Un usuario'} te solicitó un trade`

    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'trade_requested',
      match_id: matchId,
      from_user_id: user.id,
      content: notificationContent,
    })

    // Send push notification (fire-and-forget)
    sendPushNotification({
      user_id: otherUserId,
      title: 'Nueva solicitud de trade',
      body: notificationContent,
      data: {
        type: 'trade_requested',
        matchId,
        url: `/dashboard/matches/${matchId}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request trade error:', error)
    return NextResponse.json(
      { error: 'Error al solicitar trade' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel a trade request
export async function DELETE(
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

    // Only the requester can cancel, or the other user can reject
    if (match.status !== 'requested') {
      return NextResponse.json(
        { error: 'No hay solicitud de trade para cancelar' },
        { status: 400 }
      )
    }

    const isRequester = match.requested_by === user.id

    // Update match status back to active
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'active',
        requested_by: null,
        requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('Error updating match:', updateError)
      return NextResponse.json(
        { error: 'Error al cancelar solicitud' },
        { status: 500 }
      )
    }

    // Notify the other user if not the requester canceling their own request
    if (!isRequester) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const notificationContent = `${currentUser?.display_name || 'Un usuario'} rechazó tu solicitud de trade`

      await supabase.from('notifications').insert({
        user_id: match.requested_by,
        type: 'request_invalidated',
        match_id: matchId,
        from_user_id: user.id,
        content: notificationContent,
      })

      // Send push notification (fire-and-forget)
      sendPushNotification({
        user_id: match.requested_by,
        title: 'Solicitud rechazada',
        body: notificationContent,
        data: {
          type: 'trade_requested',
          matchId,
          url: `/dashboard/matches/${matchId}`,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel trade request error:', error)
    return NextResponse.json(
      { error: 'Error al cancelar solicitud' },
      { status: 500 }
    )
  }
}
