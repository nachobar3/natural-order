import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  conditionMeetsMinimum,
  foilMatches,
  editionMatches,
  calculateMatchScore,
  calculateDistance,
  calculateAskingPrice,
} from '@/lib/matching'

export const dynamic = 'force-dynamic'

interface WishlistItem {
  id: string
  user_id: string
  card_id: string
  oracle_id: string
  quantity: number
  max_price: number | null
  min_condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  foil_preference: 'any' | 'foil_only' | 'non_foil'
  edition_preference: 'any' | 'specific'
  specific_editions: string[]
  cards: {
    id: string
    scryfall_id: string
    oracle_id: string
    name: string
    set_code: string
    image_uri: string | null
    prices_usd: number | null
    prices_usd_foil: number | null
  }
}

interface CollectionItem {
  id: string
  user_id: string
  card_id: string
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  foil: boolean
  price_mode: 'percentage' | 'fixed'
  price_percentage: number
  price_fixed: number | null
  cards: {
    id: string
    scryfall_id: string
    oracle_id: string
    name: string
    set_code: string
    image_uri: string | null
    prices_usd: number | null
    prices_usd_foil: number | null
  }
}

// POST - Recalculate match between two users
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

    // Get existing match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 })
    }

    // Don't allow recalculation on completed/cancelled/confirmed matches
    if (['completed', 'cancelled', 'confirmed'].includes(match.status)) {
      return NextResponse.json(
        { error: 'No se puede recalcular un trade en este estado' },
        { status: 400 }
      )
    }

    const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id

    // Get both users' locations
    const { data: myLocation } = await supabase
      .from('locations')
      .select('latitude, longitude, radius_km')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const { data: theirLocation } = await supabase
      .from('locations')
      .select('latitude, longitude, radius_km')
      .eq('user_id', otherUserId)
      .eq('is_active', true)
      .single()

    if (!myLocation || !theirLocation) {
      return NextResponse.json(
        { error: 'Uno de los usuarios no tiene ubicación activa' },
        { status: 400 }
      )
    }

    // Get my wishlist and collection
    const { data: myWishlist } = await supabase
      .from('wishlist')
      .select('*, cards(*)')
      .eq('user_id', user.id) as { data: WishlistItem[] | null }

    const { data: myCollection } = await supabase
      .from('collections')
      .select('*, cards(*)')
      .eq('user_id', user.id) as { data: CollectionItem[] | null }

    // Get their wishlist and collection
    const { data: theirWishlist } = await supabase
      .from('wishlist')
      .select('*, cards(*)')
      .eq('user_id', otherUserId) as { data: WishlistItem[] | null }

    const { data: theirCollection } = await supabase
      .from('collections')
      .select('*, cards(*)')
      .eq('user_id', otherUserId) as { data: CollectionItem[] | null }

    // Calculate matches
    const cardsIWant: {
      wishlistItem: WishlistItem
      collectionItem: CollectionItem
      askingPrice: number | null
      priceExceedsMax: boolean
    }[] = []

    const cardsTheyWant: {
      wishlistItem: WishlistItem
      collectionItem: CollectionItem
      askingPrice: number | null
      priceExceedsMax: boolean
    }[] = []

    // Check what I want from their collection
    if (myWishlist && theirCollection) {
      for (const wishItem of myWishlist) {
        for (const collItem of theirCollection) {
          const wishOracleId = wishItem.cards?.oracle_id
          const collOracleId = collItem.cards?.oracle_id

          if (!wishOracleId || !collOracleId || wishOracleId !== collOracleId) continue

          if (!editionMatches(
            collItem.cards.scryfall_id,
            wishItem.edition_preference,
            wishItem.specific_editions || []
          )) continue

          if (!conditionMeetsMinimum(collItem.condition, wishItem.min_condition)) continue
          if (!foilMatches(collItem.foil, wishItem.foil_preference)) continue

          const askingPrice = calculateAskingPrice(
            collItem.price_mode,
            collItem.price_percentage,
            collItem.price_fixed,
            collItem.cards.prices_usd,
            collItem.foil,
            collItem.cards.prices_usd_foil
          )

          const priceExceedsMax = wishItem.max_price !== null &&
            askingPrice !== null &&
            askingPrice > wishItem.max_price

          cardsIWant.push({ wishlistItem: wishItem, collectionItem: collItem, askingPrice, priceExceedsMax })
        }
      }
    }

    // Check what they want from my collection
    if (theirWishlist && myCollection) {
      for (const wishItem of theirWishlist) {
        for (const collItem of myCollection) {
          const wishOracleId = wishItem.cards?.oracle_id
          const collOracleId = collItem.cards?.oracle_id

          if (!wishOracleId || !collOracleId || wishOracleId !== collOracleId) continue

          if (!editionMatches(
            collItem.cards.scryfall_id,
            wishItem.edition_preference,
            wishItem.specific_editions || []
          )) continue

          if (!conditionMeetsMinimum(collItem.condition, wishItem.min_condition)) continue
          if (!foilMatches(collItem.foil, wishItem.foil_preference)) continue

          const askingPrice = calculateAskingPrice(
            collItem.price_mode,
            collItem.price_percentage,
            collItem.price_fixed,
            collItem.cards.prices_usd,
            collItem.foil,
            collItem.cards.prices_usd_foil
          )

          const priceExceedsMax = wishItem.max_price !== null &&
            askingPrice !== null &&
            askingPrice > wishItem.max_price

          cardsTheyWant.push({ wishlistItem: wishItem, collectionItem: collItem, askingPrice, priceExceedsMax })
        }
      }
    }

    // Get existing custom cards count for the response
    const { data: existingCustomCardsCheck } = await supabase
      .from('match_cards')
      .select('id, direction, is_custom')
      .eq('match_id', matchId)
      .eq('is_custom', true)

    const customCardsCount = existingCustomCardsCheck?.length || 0

    // If no wishlist matches found but there might be custom cards
    if (cardsIWant.length === 0 && cardsTheyWant.length === 0) {
      // Delete only non-custom match cards
      await supabase
        .from('match_cards')
        .delete()
        .eq('match_id', matchId)
        .eq('is_custom', false)

      // If there are custom cards, keep the match active
      if (customCardsCount > 0) {
        await supabase
          .from('matches')
          .update({
            is_user_modified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchId)

        return NextResponse.json({
          success: true,
          message: 'No hay coincidencias de wishlist, pero hay cartas agregadas manualmente',
          cardsIWant: 0,
          cardsTheyWant: 0,
          customCardsPreserved: customCardsCount,
        })
      }

      // No custom cards either - update match to reflect no cards
      await supabase
        .from('matches')
        .update({
          cards_a_wants_count: 0,
          cards_b_wants_count: 0,
          value_a_wants: 0,
          value_b_wants: 0,
          match_score: 0,
          has_price_warnings: false,
          is_user_modified: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)

      return NextResponse.json({
        success: true,
        message: 'No hay cartas coincidentes entre los usuarios',
        cardsIWant: 0,
        cardsTheyWant: 0,
      })
    }

    // Determine match type
    let matchType: 'two_way' | 'one_way_buy' | 'one_way_sell'
    if (cardsIWant.length > 0 && cardsTheyWant.length > 0) {
      matchType = 'two_way'
    } else if (cardsIWant.length > 0) {
      matchType = 'one_way_buy'
    } else {
      matchType = 'one_way_sell'
    }

    // Calculate values
    const valueIWant = cardsIWant.reduce((sum, c) => sum + (c.askingPrice || 0), 0)
    const valueTheyWant = cardsTheyWant.reduce((sum, c) => sum + (c.askingPrice || 0), 0)

    // Calculate distance
    const distance = calculateDistance(
      myLocation.latitude,
      myLocation.longitude,
      theirLocation.latitude,
      theirLocation.longitude
    )

    const hasPriceWarnings = cardsIWant.some(c => c.priceExceedsMax) ||
      cardsTheyWant.some(c => c.priceExceedsMax)

    // Calculate price efficiency
    let priceEfficiency = 0.5
    const cardsWithMaxPrice = cardsIWant.filter(c => c.wishlistItem.max_price !== null && c.askingPrice !== null)
    if (cardsWithMaxPrice.length > 0) {
      const totalRatio = cardsWithMaxPrice.reduce((sum, c) => {
        return sum + (c.askingPrice! / c.wishlistItem.max_price!)
      }, 0)
      priceEfficiency = Math.min(totalRatio / cardsWithMaxPrice.length, 1)
    }

    // Calculate match score
    const matchScore = calculateMatchScore({
      matchType,
      cardsAWantsCount: cardsIWant.length,
      cardsBWantsCount: cardsTheyWant.length,
      valueAWants: valueIWant,
      valueBWants: valueTheyWant,
      distanceKm: distance,
      hasPriceWarnings,
      priceEfficiency,
    })

    // Determine user ordering (consistent with original match)
    const isUserA = user.id === match.user_a_id
    const [aWantsCount, bWantsCount] = isUserA
      ? [cardsIWant.length, cardsTheyWant.length]
      : [cardsTheyWant.length, cardsIWant.length]

    const [valueAWants, valueBWants] = isUserA
      ? [valueIWant, valueTheyWant]
      : [valueTheyWant, valueIWant]

    // Custom cards are preserved by the delete filter below
    // Delete only non-custom match cards (preserve custom ones)
    await supabase
      .from('match_cards')
      .delete()
      .eq('match_id', matchId)
      .eq('is_custom', false)

    // Update match
    await supabase
      .from('matches')
      .update({
        match_type: matchType,
        distance_km: distance,
        cards_a_wants_count: aWantsCount,
        cards_b_wants_count: bWantsCount,
        value_a_wants: valueAWants,
        value_b_wants: valueBWants,
        match_score: matchScore,
        has_price_warnings: hasPriceWarnings,
        is_user_modified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    // Insert new match cards
    const matchCards = []

    for (const card of cardsIWant) {
      matchCards.push({
        match_id: matchId,
        direction: isUserA ? 'a_wants' : 'b_wants',
        wishlist_id: card.wishlistItem.id,
        collection_id: card.collectionItem.id,
        card_id: card.collectionItem.card_id,
        card_name: card.collectionItem.cards.name,
        card_set_code: card.collectionItem.cards.set_code,
        card_image_uri: card.collectionItem.cards.image_uri,
        asking_price: card.askingPrice,
        max_price: card.wishlistItem.max_price,
        price_exceeds_max: card.priceExceedsMax,
        collection_condition: card.collectionItem.condition,
        wishlist_min_condition: card.wishlistItem.min_condition,
        is_foil: card.collectionItem.foil,
        quantity_available: card.collectionItem.quantity,
        quantity_wanted: card.wishlistItem.quantity,
        is_excluded: false,
      })
    }

    for (const card of cardsTheyWant) {
      matchCards.push({
        match_id: matchId,
        direction: isUserA ? 'b_wants' : 'a_wants',
        wishlist_id: card.wishlistItem.id,
        collection_id: card.collectionItem.id,
        card_id: card.collectionItem.card_id,
        card_name: card.collectionItem.cards.name,
        card_set_code: card.collectionItem.cards.set_code,
        card_image_uri: card.collectionItem.cards.image_uri,
        asking_price: card.askingPrice,
        max_price: card.wishlistItem.max_price,
        price_exceeds_max: card.priceExceedsMax,
        collection_condition: card.collectionItem.condition,
        wishlist_min_condition: card.wishlistItem.min_condition,
        is_foil: card.collectionItem.foil,
        quantity_available: card.collectionItem.quantity,
        quantity_wanted: card.wishlistItem.quantity,
        is_excluded: false,
      })
    }

    if (matchCards.length > 0) {
      await supabase.from('match_cards').insert(matchCards)
    }

    return NextResponse.json({
      success: true,
      matchType,
      cardsIWant: cardsIWant.length,
      cardsTheyWant: cardsTheyWant.length,
      valueIWant,
      valueTheyWant,
      matchScore,
    })
  } catch (error) {
    console.error('Recalculate match error:', error)
    return NextResponse.json(
      { error: 'Error al recalcular match' },
      { status: 500 }
    )
  }
}
