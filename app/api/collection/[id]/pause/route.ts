import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// PATCH - Toggle pause status for a collection item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = params

    // Get current item to verify ownership and get current pause status
    const { data: item, error: fetchError } = await supabase
      .from('collections')
      .select('id, is_paused')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
    }

    // Toggle pause status
    const newPausedStatus = !item.is_paused

    const { error: updateError } = await supabase
      .from('collections')
      .update({
        is_paused: newPausedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating pause status:', updateError)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    // Trigger match recalculation in background
    fetch(new URL('/api/matches/compute', request.url).toString(), {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    }).catch(err => console.error('Error triggering match recalculation:', err))

    return NextResponse.json({
      success: true,
      isPaused: newPausedStatus,
    })
  } catch (error) {
    console.error('Pause toggle error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
