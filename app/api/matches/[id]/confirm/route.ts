import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

const ESCROW_DAYS = 15

// POST - Confirm a trade (moves to escrow)
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
    if (match.status !== 'requested') {
      return NextResponse.json(
        { error: 'Solo se puede confirmar un trade solicitado' },
        { status: 400 }
      )
    }

    // Only the non-requester can confirm
    if (match.requested_by === user.id) {
      return NextResponse.json(
        { error: 'No podés confirmar tu propia solicitud' },
        { status: 400 }
      )
    }

    const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id

    // Calculate escrow expiration (15 days from now)
    const escrowExpiresAt = new Date()
    escrowExpiresAt.setDate(escrowExpiresAt.getDate() + ESCROW_DAYS)

    // Update match status to confirmed
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        escrow_expires_at: escrowExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('Error updating match:', updateError)
      return NextResponse.json(
        { error: 'Error al confirmar trade' },
        { status: 500 }
      )
    }

    // Create notification for the requester
    const { data: currentUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const notificationContent = `${currentUser?.display_name || 'Un usuario'} confirmó el trade. Tienen ${ESCROW_DAYS} días para completarlo.`

    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'trade_confirmed',
      match_id: matchId,
      from_user_id: user.id,
      content: notificationContent,
    })

    // Send push notification (fire-and-forget)
    sendPushNotification({
      user_id: otherUserId,
      title: '¡Trade confirmado!',
      body: notificationContent,
      data: {
        type: 'trade_confirmed',
        matchId,
        url: `/dashboard/matches/${matchId}`,
      },
    })

    return NextResponse.json({
      success: true,
      escrowExpiresAt: escrowExpiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Confirm trade error:', error)
    return NextResponse.json(
      { error: 'Error al confirmar trade' },
      { status: 500 }
    )
  }
}
