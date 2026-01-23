import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const statusParam = searchParams.get('status')
    const includeCounts = searchParams.get('counts') === 'true'
    const sortBy = searchParams.get('sort_by') || 'score' // score, distance, cards, value, discount

    // Support multiple statuses via comma-separated values
    const statuses = statusParam ? statusParam.split(',') : ['active']

    // If counts requested, fetch counts by UI category
    let categoryCounts = null
    if (includeCounts) {
      const { data: allMatches } = await supabase
        .from('matches')
        .select('status')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

      if (allMatches) {
        categoryCounts = {
          disponibles: allMatches.filter(m => m.status === 'active').length,
          activos: allMatches.filter(m => ['contacted', 'requested'].includes(m.status)).length,
          confirmados: allMatches.filter(m => m.status === 'confirmed').length,
          realizados: allMatches.filter(m => m.status === 'completed').length,
          cancelados: allMatches.filter(m => m.status === 'cancelled').length,
          descartados: allMatches.filter(m => m.status === 'dismissed').length,
        }
      }
    }

    // Get matches where current user is involved
    let query = supabase
      .from('matches')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

    // Filter by multiple statuses
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0])
    } else {
      query = query.in('status', statuses)
    }

    const { data: matches, error } = await query.order('match_score', { ascending: false })

    if (error) {
      console.error('Error fetching matches:', error)
      return NextResponse.json({ error: 'Error al obtener trades' }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        matches: [],
        ...(categoryCounts && { counts: categoryCounts })
      })
    }

    const matchIds = matches.map(m => m.id)

    // Get unique other user IDs
    const otherUserIds = Array.from(new Set(matches.map(m =>
      m.user_a_id === user.id ? m.user_b_id : m.user_a_id
    )))

    // Fetch user info separately
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', otherUserIds)

    // Fetch match_cards for all matches
    const { data: matchCards } = await supabase
      .from('match_cards')
      .select('match_id, card_name, card_set_code, asking_price, direction, card_id')
      .in('match_id', matchIds)
      .order('asking_price', { ascending: false })

    // Get card market prices for discount calculation
    const cardIds = Array.from(new Set(matchCards?.map(mc => mc.card_id) || []))
    const { data: cardPrices } = await supabase
      .from('cards')
      .select('id, prices_usd')
      .in('id', cardIds)

    const cardPricesMap = new Map(cardPrices?.map(c => [c.id, c.prices_usd]) || [])

    const usersMap = new Map(users?.map(u => [u.id, u]) || [])

    // Group cards by match_id
    const cardsMap = new Map<string, typeof matchCards>()
    matchCards?.forEach(card => {
      const existing = cardsMap.get(card.match_id) || []
      existing.push(card)
      cardsMap.set(card.match_id, existing)
    })

    // Transform to show the "other" user's info from current user's perspective
    const transformedMatches = matches.map(match => {
      const isUserA = match.user_a_id === user.id
      const otherUserId = isUserA ? match.user_b_id : match.user_a_id
      const otherUser = usersMap.get(otherUserId)

      // Get cards for this match
      const cards = cardsMap.get(match.id) || []

      // Separate cards by direction (from my perspective)
      // If I'm user_a, I want 'a_wants' cards; if I'm user_b, I want 'b_wants' cards
      const cardsIWantRaw = cards.filter(c => isUserA ? c.direction === 'a_wants' : c.direction === 'b_wants')
      const cardsIWantList = cardsIWantRaw.map(c => ({ name: c.card_name, setCode: c.card_set_code, price: c.asking_price }))

      const cardsTheyWantList = cards
        .filter(c => isUserA ? c.direction === 'b_wants' : c.direction === 'a_wants')
        .map(c => ({ name: c.card_name, setCode: c.card_set_code, price: c.asking_price }))

      // Calculate average discount percent for cards I want to buy
      // Discount = 100 - (asking_price / market_price * 100)
      let avgDiscountPercent: number | null = null
      const discounts: number[] = []
      for (const card of cardsIWantRaw) {
        const marketPrice = cardPricesMap.get(card.card_id)
        if (marketPrice && marketPrice > 0 && card.asking_price) {
          const pricePercent = (Number(card.asking_price) / Number(marketPrice)) * 100
          const discount = 100 - pricePercent
          discounts.push(discount)
        }
      }
      if (discounts.length > 0) {
        avgDiscountPercent = Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
      }

      // Cards I want vs Cards they want (from my perspective)
      const cardsIWant = isUserA ? match.cards_a_wants_count : match.cards_b_wants_count
      const cardsTheyWant = isUserA ? match.cards_b_wants_count : match.cards_a_wants_count
      const valueIWant = isUserA ? match.value_a_wants : match.value_b_wants
      const valueTheyWant = isUserA ? match.value_b_wants : match.value_a_wants

      // Adjust match type from my perspective
      let myMatchType = match.match_type
      if (!isUserA) {
        if (match.match_type === 'one_way_buy') {
          myMatchType = 'one_way_sell' // If user_a buys, user_b sells
        } else if (match.match_type === 'one_way_sell') {
          myMatchType = 'one_way_buy'
        }
      }

      return {
        id: match.id,
        otherUser: {
          id: otherUserId,
          displayName: otherUser?.display_name || 'Usuario',
          avatarUrl: otherUser?.avatar_url || null,
        },
        matchType: myMatchType,
        distanceKm: match.distance_km,
        cardsIWant,
        cardsTheyWant,
        cardsIWantList,
        cardsTheyWantList,
        valueIWant,
        valueTheyWant,
        matchScore: match.match_score,
        avgDiscountPercent,
        hasPriceWarnings: match.has_price_warnings,
        status: match.status,
        createdAt: match.created_at,
        updatedAt: match.updated_at,
      }
    })

    // Sort matches based on sort_by parameter
    // For "Pendientes" view: activos (contacted/requested) always first, then sort disponibles
    // For "Historial" view: sort by updated_at descending
    const sortedMatches = [...transformedMatches].sort((a, b) => {
      // Active statuses (contacted, requested) always come first within pendientes
      const activeStatuses = ['contacted', 'requested']
      const aIsActive = activeStatuses.includes(a.status)
      const bIsActive = activeStatuses.includes(b.status)

      if (aIsActive && !bIsActive) return -1
      if (!aIsActive && bIsActive) return 1

      // For historial statuses, always sort by updated_at
      const historialStatuses = ['confirmed', 'completed', 'cancelled', 'dismissed']
      if (historialStatuses.includes(a.status) && historialStatuses.includes(b.status)) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }

      // Apply user-selected sorting for disponibles (active status)
      switch (sortBy) {
        case 'discount':
          // Higher discount first (null values at end)
          if (a.avgDiscountPercent === null && b.avgDiscountPercent === null) return 0
          if (a.avgDiscountPercent === null) return 1
          if (b.avgDiscountPercent === null) return -1
          return b.avgDiscountPercent - a.avgDiscountPercent
        case 'distance':
          // Closer first (null values at end)
          if (a.distanceKm === null && b.distanceKm === null) return 0
          if (a.distanceKm === null) return 1
          if (b.distanceKm === null) return -1
          return Number(a.distanceKm) - Number(b.distanceKm)
        case 'cards':
          // More cards first
          return (b.cardsIWant + b.cardsTheyWant) - (a.cardsIWant + a.cardsTheyWant)
        case 'value':
          // Higher value first
          return (Number(b.valueIWant) + Number(b.valueTheyWant)) - (Number(a.valueIWant) + Number(a.valueTheyWant))
        case 'score':
        default:
          // Higher score first
          return Number(b.matchScore) - Number(a.matchScore)
      }
    })

    return NextResponse.json({
      matches: sortedMatches,
      ...(categoryCounts && { counts: categoryCounts })
    })
  } catch (error) {
    console.error('Get matches error:', error)
    return NextResponse.json({ error: 'Error al obtener trades' }, { status: 500 })
  }
}

// Update match status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { matchId, status } = await request.json()

    if (!matchId || !status) {
      return NextResponse.json({ error: 'matchId y status requeridos' }, { status: 400 })
    }

    if (!['active', 'dismissed', 'contacted'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('matches')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

    if (error) {
      console.error('Error updating match:', error)
      return NextResponse.json({ error: 'Error al actualizar trade' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update match error:', error)
    return NextResponse.json({ error: 'Error al actualizar trade' }, { status: 500 })
  }
}
