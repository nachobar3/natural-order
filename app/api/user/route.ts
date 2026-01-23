import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get current user info
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ id: user.id, email: user.email })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}
