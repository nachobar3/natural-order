import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    // Filter params
    const condition = searchParams.get('condition') || ''
    const foil = searchParams.get('foil') || '' // 'foil', 'non-foil', or ''
    const rarity = searchParams.get('rarity') || ''
    const colors = searchParams.get('colors') || '' // comma-separated: 'W,U,B'
    const cardType = searchParams.get('type') || ''
    const sortBy = searchParams.get('sort') || 'date-desc'

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
        created_at,
        cards (
          id,
          name,
          set_code,
          set_name,
          image_uri,
          image_uri_small,
          prices_usd,
          prices_usd_foil,
          rarity,
          colors,
          type_line,
          cmc
        )
      `, { count: 'exact' })
      .eq('user_id', otherUserId)
      .gt('quantity', 0)

    // Apply condition filter
    if (condition) {
      query = query.eq('condition', condition)
    }

    // Apply foil filter
    if (foil === 'foil') {
      query = query.eq('foil', true)
    } else if (foil === 'non-foil') {
      query = query.eq('foil', false)
    }

    // Apply card-level filters (search, rarity, colors, type) via subquery
    const hasCardFilters = search.trim() || rarity || colors || cardType
    if (hasCardFilters) {
      let cardQuery = supabase.from('cards').select('id')

      // Search by name
      if (search.trim()) {
        cardQuery = cardQuery.ilike('name', `%${search.trim()}%`)
      }

      // Rarity filter
      if (rarity) {
        cardQuery = cardQuery.eq('rarity', rarity)
      }

      // Type filter (partial match)
      if (cardType) {
        cardQuery = cardQuery.ilike('type_line', `%${cardType}%`)
      }

      // Colors filter - cards that contain any of the selected colors
      // 'C' means colorless (empty colors array)
      if (colors) {
        const colorList = colors.split(',').filter(Boolean)
        const hasColorless = colorList.includes('C')
        const actualColors = colorList.filter(c => c !== 'C')

        if (hasColorless && actualColors.length === 0) {
          // Only colorless selected
          cardQuery = cardQuery.eq('colors', '{}')
        } else if (actualColors.length > 0) {
          // Has actual colors - use overlaps for "contains any"
          cardQuery = cardQuery.overlaps('colors', actualColors)
        }
      }

      const { data: matchingCardIds } = await cardQuery.limit(500)

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

    // Determine sort order
    // Note: sorting by card fields (name, price) requires post-processing
    // For now, we support sorting by collection fields
    let orderColumn = 'created_at'
    let ascending = false

    switch (sortBy) {
      case 'date-asc':
        orderColumn = 'created_at'
        ascending = true
        break
      case 'date-desc':
        orderColumn = 'created_at'
        ascending = false
        break
      case 'condition-asc':
        orderColumn = 'condition'
        ascending = true
        break
      default:
        orderColumn = 'created_at'
        ascending = false
    }

    // Now get the actual data with pagination
    const { data: collection, error: collectionError } = await query
      .order(orderColumn, { ascending })
      .range(offset, offset + limit - 1)

    if (collectionError) {
      console.error('Error fetching collection:', collectionError)
      return NextResponse.json(
        { error: 'Error al obtener colección' },
        { status: 500 }
      )
    }

    // Transform and calculate asking prices
    let cards = (collection || []).map(item => {
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
        rarity: string | null
        colors: string[] | null
        type_line: string | null
        cmc: number | null
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
        rarity: card.rarity,
        cmc: card.cmc,
      }
    })

    // Post-process sorting for card-level fields
    switch (sortBy) {
      case 'price-desc':
        cards = cards.sort((a, b) => (b.askingPrice || 0) - (a.askingPrice || 0))
        break
      case 'price-asc':
        cards = cards.sort((a, b) => (a.askingPrice || 0) - (b.askingPrice || 0))
        break
      case 'name-asc':
        cards = cards.sort((a, b) => a.cardName.localeCompare(b.cardName))
        break
      case 'name-desc':
        cards = cards.sort((a, b) => b.cardName.localeCompare(a.cardName))
        break
      case 'cmc-asc':
        cards = cards.sort((a, b) => (a.cmc || 0) - (b.cmc || 0))
        break
      case 'cmc-desc':
        cards = cards.sort((a, b) => (b.cmc || 0) - (a.cmc || 0))
        break
    }

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
