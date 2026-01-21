import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'

    // Get matches where current user is involved
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .eq('status', status)
      .order('match_score', { ascending: false })

    if (error) {
      console.error('Error fetching matches:', error)
      return NextResponse.json({ error: 'Error al obtener trades' }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ matches: [] })
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
      .select('match_id, card_name, card_set_code, asking_price, direction')
      .in('match_id', matchIds)
      .order('asking_price', { ascending: false })

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
      const cardsIWantList = cards
        .filter(c => isUserA ? c.direction === 'a_wants' : c.direction === 'b_wants')
        .map(c => ({ name: c.card_name, setCode: c.card_set_code, price: c.asking_price }))

      const cardsTheyWantList = cards
        .filter(c => isUserA ? c.direction === 'b_wants' : c.direction === 'a_wants')
        .map(c => ({ name: c.card_name, setCode: c.card_set_code, price: c.asking_price }))

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
        hasPriceWarnings: match.has_price_warnings,
        status: match.status,
        createdAt: match.created_at,
        updatedAt: match.updated_at,
      }
    })

    return NextResponse.json({ matches: transformedMatches || [] })
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
