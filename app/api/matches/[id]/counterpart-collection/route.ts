import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get counterpart's full collection with pagination and search
export async function GET(
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    // Get the match to find the other user
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id, status')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Trade no encontrado' }, { status: 404 })
    }

    const isUserA = match.user_a_id === user.id
    const otherUserId = isUserA ? match.user_b_id : match.user_a_id
    const myDirection = isUserA ? 'a_wants' : 'b_wants'

    // Get cards already in this trade (to mark as "already in trade")
    const { data: existingMatchCards } = await supabase
      .from('match_cards')
      .select('collection_id')
      .eq('match_id', matchId)
      .eq('direction', myDirection)
      .eq('is_excluded', false)

    const existingCollectionIds = new Set(
      existingMatchCards?.map(mc => mc.collection_id) || []
    )

    // Build query for counterpart's collection
    let query = supabase
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
          set_name,
          image_uri,
          image_uri_small,
          prices_usd,
          prices_usd_foil
        )
      `, { count: 'exact' })
      .eq('user_id', otherUserId)
      .gt('quantity', 0)

    // Add search filter if provided
    if (search.trim()) {
      // We need to filter by card name - using a subquery approach
      const { data: matchingCardIds } = await supabase
        .from('cards')
        .select('id')
        .ilike('name', `%${search.trim()}%`)
        .limit(100)

      if (matchingCardIds && matchingCardIds.length > 0) {
        const cardIds = matchingCardIds.map(c => c.id)
        query = query.in('card_id', cardIds)
      } else {
        // No matching cards, return empty
        return NextResponse.json({
          cards: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        })
      }
    }

    // Get total count first, then paginate
    const { count } = await query

    // Now get the actual data with pagination
    const { data: collection, error: collectionError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (collectionError) {
      console.error('Error fetching collection:', collectionError)
      return NextResponse.json(
        { error: 'Error al obtener colección' },
        { status: 500 }
      )
    }

    // Transform and calculate asking prices
    const cards = (collection || []).map(item => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const card = item.cards as any as {
        id: string
        name: string
        set_code: string
        set_name: string
        image_uri: string | null
        image_uri_small: string | null
        prices_usd: number | null
        prices_usd_foil: number | null
      }

      // Calculate asking price
      let askingPrice: number | null = null
      if (item.price_mode === 'fixed' && item.price_fixed !== null) {
        askingPrice = item.price_fixed
      } else {
        const basePrice = item.foil ? card.prices_usd_foil : card.prices_usd
        if (basePrice !== null) {
          askingPrice = Math.round(basePrice * (item.price_percentage / 100) * 100) / 100
        }
      }

      return {
        collectionId: item.id,
        cardId: item.card_id,
        cardName: card.name,
        cardSetCode: card.set_code,
        cardSetName: card.set_name,
        cardImageUri: card.image_uri,
        cardImageUriSmall: card.image_uri_small,
        condition: item.condition,
        isFoil: item.foil,
        quantity: item.quantity,
        askingPrice,
        alreadyInTrade: existingCollectionIds.has(item.id),
      }
    })

    return NextResponse.json({
      cards,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Get counterpart collection error:', error)
    return NextResponse.json(
      { error: 'Error al obtener colección' },
      { status: 500 }
    )
  }
}
