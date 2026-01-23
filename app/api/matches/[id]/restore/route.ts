import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST - Restore match to saved state (remove all exclusions)
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

    // Reset all cards to not excluded
    const { error: resetError } = await supabase
      .from('match_cards')
      .update({ is_excluded: false })
      .eq('match_id', matchId)

    if (resetError) {
      console.error('Error resetting cards:', resetError)
      return NextResponse.json(
        { error: 'Error al restaurar cartas' },
        { status: 500 }
      )
    }

    // Calculate new values
    const { data: values } = await supabase.rpc('calculate_match_values', {
      p_match_id: matchId,
    })

    return NextResponse.json({
      success: true,
      values: values?.[0] || null,
    })
  } catch (error) {
    console.error('Restore match error:', error)
    return NextResponse.json(
      { error: 'Error al restaurar match' },
      { status: 500 }
    )
  }
}
