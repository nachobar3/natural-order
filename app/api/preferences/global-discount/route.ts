import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - Get current global discount percentage
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: preferences, error } = await supabase
      .from('preferences')
      .select('default_price_percentage, minimum_price, collection_paused')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: 'Error al obtener preferencias' }, { status: 500 })
    }

    // Default to 80% if no preference set, 0 for minimum price, false for collection_paused
    const percentage = preferences?.default_price_percentage ?? 80
    const minimumPrice = preferences?.minimum_price ?? 0
    const collectionPaused = preferences?.collection_paused ?? false

    return NextResponse.json({ percentage, minimumPrice, collectionPaused })
  } catch (error) {
    console.error('Global discount GET error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT - Update global discount percentage and/or collection paused status
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { percentage, minimumPrice, collectionPaused } = await request.json()

    if (typeof percentage !== 'number' || percentage < 1 || percentage > 200) {
      return NextResponse.json(
        { error: 'El porcentaje debe estar entre 1 y 200' },
        { status: 400 }
      )
    }

    if (minimumPrice !== undefined && (typeof minimumPrice !== 'number' || minimumPrice < 0)) {
      return NextResponse.json(
        { error: 'El precio mínimo debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    // Get current preferences to check if collection_paused changed
    const { data: currentPrefs } = await supabase
      .from('preferences')
      .select('collection_paused')
      .eq('user_id', user.id)
      .single()

    const previousCollectionPaused = currentPrefs?.collection_paused ?? false
    const newCollectionPaused = collectionPaused ?? previousCollectionPaused

    // Upsert preferences
    const updateData: Record<string, unknown> = {
      user_id: user.id,
      default_price_percentage: percentage,
    }

    if (minimumPrice !== undefined) {
      updateData.minimum_price = minimumPrice
    }

    if (collectionPaused !== undefined) {
      updateData.collection_paused = collectionPaused
    }

    const { error } = await supabase
      .from('preferences')
      .upsert(updateData, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Error al actualizar preferencias' }, { status: 500 })
    }

    // Trigger match recalculation if collection_paused status changed
    if (collectionPaused !== undefined && collectionPaused !== previousCollectionPaused) {
      fetch(new URL('/api/matches/compute', request.url).toString(), {
        method: 'POST',
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }).catch(err => console.error('Error triggering match recalculation:', err))
    }

    return NextResponse.json({ success: true, percentage, minimumPrice, collectionPaused: newCollectionPaused })
  } catch (error) {
    console.error('Global discount PUT error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - Apply global discount to all cards without override
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { percentage } = await request.json()

    if (typeof percentage !== 'number' || percentage < 1 || percentage > 200) {
      return NextResponse.json(
        { error: 'El porcentaje debe estar entre 1 y 200' },
        { status: 400 }
      )
    }

    // Update all cards that don't have price_override
    const { data, error } = await supabase
      .from('collections')
      .update({
        price_percentage: percentage,
        price_mode: 'percentage',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('price_override', false)
      .select('id')

    if (error) {
      console.error('Error applying global discount:', error)
      return NextResponse.json({ error: 'Error al aplicar descuento' }, { status: 500 })
    }

    const updatedCount = data?.length ?? 0

    // Also update the preference
    await supabase
      .from('preferences')
      .upsert({
        user_id: user.id,
        default_price_percentage: percentage,
      }, {
        onConflict: 'user_id',
      })

    // Trigger match recalculation
    fetch(new URL('/api/matches/compute', request.url).toString(), {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    }).catch(err => console.error('Error triggering match recalculation:', err))

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Se actualizaron ${updatedCount} cartas al ${percentage}%`
    })
  } catch (error) {
    console.error('Global discount POST error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
