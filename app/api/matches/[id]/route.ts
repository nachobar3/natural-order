import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Trade no encontrado' }, { status: 404 })
    }

    // Get match cards
    const { data: matchCards, error: cardsError } = await supabase
      .from('match_cards')
      .select('*')
      .eq('match_id', id)
      .order('asking_price', { ascending: true })

    if (cardsError) {
      console.error('Error fetching match cards:', cardsError)
    }

    const isUserA = match.user_a_id === user.id
    const otherUserId = isUserA ? match.user_b_id : match.user_a_id

    // Fetch other user info separately
    const { data: otherUser } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .eq('id', otherUserId)
      .single()

    // Fetch other user's location
    const { data: otherUserLocation } = await supabase
      .from('locations')
      .select('latitude, longitude')
      .eq('user_id', otherUserId)
      .eq('is_active', true)
      .single()

    // Separate cards into "I want" and "they want"
    const cardsIWant = matchCards?.filter(c => {
      // If I'm user_a, I want cards where direction is 'a_wants'
      // If I'm user_b, I want cards where direction is 'b_wants'
      return isUserA ? c.direction === 'a_wants' : c.direction === 'b_wants'
    }) || []

    const cardsTheyWant = matchCards?.filter(c => {
      return isUserA ? c.direction === 'b_wants' : c.direction === 'a_wants'
    }) || []

    // Transform match
    let myMatchType = match.match_type
    if (!isUserA) {
      if (match.match_type === 'one_way_buy') {
        myMatchType = 'one_way_sell'
      } else if (match.match_type === 'one_way_sell') {
        myMatchType = 'one_way_buy'
      }
    }

    // Calculate totals excluding excluded cards
    const activeCardsIWant = cardsIWant.filter(c => !c.is_excluded)
    const activeCardsTheyWant = cardsTheyWant.filter(c => !c.is_excluded)

    const result = {
      id: match.id,
      otherUser: {
        id: otherUser?.id,
        displayName: otherUser?.display_name || 'Usuario',
        avatarUrl: otherUser?.avatar_url,
        location: otherUserLocation ? {
          latitude: otherUserLocation.latitude,
          longitude: otherUserLocation.longitude,
        } : null,
      },
      matchType: myMatchType,
      distanceKm: match.distance_km,
      matchScore: match.match_score,
      hasPriceWarnings: match.has_price_warnings,
      status: match.status,
      createdAt: match.created_at,

      // New trading fields
      isUserModified: match.is_user_modified || false,
      requestedBy: match.requested_by,
      requestedAt: match.requested_at,
      confirmedAt: match.confirmed_at,
      escrowExpiresAt: match.escrow_expires_at,
      hasConflict: match.has_conflict || false,
      // Perspective-aware fields
      iRequested: match.requested_by === user.id,
      theyRequested: match.requested_by === otherUserId,
      iCompleted: isUserA ? match.user_a_completed : match.user_b_completed,
      theyCompleted: isUserA ? match.user_b_completed : match.user_a_completed,

      cardsIWant: cardsIWant.map(c => ({
        id: c.id,
        cardId: c.card_id,
        cardName: c.card_name,
        cardSetCode: c.card_set_code,
        cardImageUri: c.card_image_uri,
        askingPrice: c.asking_price,
        maxPrice: c.max_price,
        priceExceedsMax: c.price_exceeds_max,
        condition: c.collection_condition,
        minCondition: c.wishlist_min_condition,
        isFoil: c.is_foil,
        quantityAvailable: c.quantity_available,
        quantityWanted: c.quantity_wanted,
        isExcluded: c.is_excluded || false,
        isCustom: c.is_custom || false,
        addedByUserId: c.added_by_user_id || null,
      })),

      cardsTheyWant: cardsTheyWant.map(c => ({
        id: c.id,
        cardId: c.card_id,
        cardName: c.card_name,
        cardSetCode: c.card_set_code,
        cardImageUri: c.card_image_uri,
        askingPrice: c.asking_price,
        maxPrice: c.max_price,
        priceExceedsMax: c.price_exceeds_max,
        condition: c.collection_condition,
        minCondition: c.wishlist_min_condition,
        isFoil: c.is_foil,
        quantityAvailable: c.quantity_available,
        quantityWanted: c.quantity_wanted,
        isExcluded: c.is_excluded || false,
        isCustom: c.is_custom || false,
        addedByUserId: c.added_by_user_id || null,
      })),

      // Totals based on active (non-excluded) cards
      totalValueIWant: activeCardsIWant.reduce((sum, c) => sum + (c.asking_price || 0), 0),
      totalValueTheyWant: activeCardsTheyWant.reduce((sum, c) => sum + (c.asking_price || 0), 0),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get match detail error:', error)
    return NextResponse.json({ error: 'Error al obtener trade' }, { status: 500 })
  }
}
