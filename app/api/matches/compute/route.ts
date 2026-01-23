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

const DEFAULT_RADIUS_KM = 25

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

interface UserLocation {
  user_id: string
  latitude: number
  longitude: number
  radius_km: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check for debug mode
    const { searchParams } = new URL(request.url)
    const debugMode = searchParams.get('debug') === 'true'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get current user's location
    const { data: myLocation } = await supabase
      .from('locations')
      .select('latitude, longitude, radius_km')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!myLocation) {
      return NextResponse.json(
        { error: 'Necesitás configurar tu ubicación para ver trades' },
        { status: 400 }
      )
    }

    const myRadius = myLocation.radius_km || DEFAULT_RADIUS_KM

    // Get my wishlist
    const { data: myWishlist, error: wishlistError } = await supabase
      .from('wishlist')
      .select('*, cards(*)')
      .eq('user_id', user.id)

    if (wishlistError) {
      console.error('Error fetching wishlist:', wishlistError)
      return NextResponse.json({ error: 'Error al obtener wishlist', details: wishlistError }, { status: 500 })
    }

    // Get my collection
    const { data: myCollection, error: collectionError } = await supabase
      .from('collections')
      .select('*, cards(*)')
      .eq('user_id', user.id)

    if (collectionError) {
      console.error('Error fetching collection:', collectionError)
      return NextResponse.json({ error: 'Error al obtener colección', details: collectionError }, { status: 500 })
    }

    if ((!myWishlist || myWishlist.length === 0) && (!myCollection || myCollection.length === 0)) {
      return NextResponse.json(
        { error: 'Necesitás cartas en tu colección o wishlist para ver trades' },
        { status: 400 }
      )
    }

    // Get all other users' locations
    const { data: otherLocations, error: locationsError } = await supabase
      .from('locations')
      .select('user_id, latitude, longitude, radius_km')
      .neq('user_id', user.id)
      .eq('is_active', true)

    if (locationsError) {
      console.error('Error fetching other locations:', locationsError)
      return NextResponse.json({ error: 'Error al obtener ubicaciones', details: locationsError }, { status: 500 })
    }

    if (!otherLocations || otherLocations.length === 0) {
      // Clear existing matches and return
      await supabase.from('matches').delete().or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      return NextResponse.json({ matches: [], message: 'No hay otros usuarios con ubicación activa' })
    }

    // Filter users within my radius
    const nearbyUsers = otherLocations.filter(loc => {
      const distance = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        loc.latitude,
        loc.longitude
      )
      // User must be within MY radius OR I must be within THEIR radius
      const theirRadius = loc.radius_km || DEFAULT_RADIUS_KM
      return distance <= myRadius || distance <= theirRadius
    })

    if (nearbyUsers.length === 0) {
      await supabase.from('matches').delete().or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      return NextResponse.json({ matches: [], message: 'No hay usuarios cercanos' })
    }

    // Get wishlist and collections for nearby users
    const nearbyUserIds = nearbyUsers.map(u => u.user_id)

    const { data: theirWishlists, error: theirWishlistError } = await supabase
      .from('wishlist')
      .select('*, cards(*)')
      .in('user_id', nearbyUserIds)

    if (theirWishlistError) {
      console.error('Error fetching their wishlists:', theirWishlistError)
    }

    const { data: theirCollections, error: theirCollectionError } = await supabase
      .from('collections')
      .select('*, cards(*)')
      .in('user_id', nearbyUserIds)

    if (theirCollectionError) {
      console.error('Error fetching their collections:', theirCollectionError)
    }

    // Debug: log what we found
    const debugInfo = {
      myUserId: user.id,
      myLocation,
      myRadius,
      myWishlistCount: myWishlist?.length || 0,
      myCollectionCount: myCollection?.length || 0,
      nearbyUsers: nearbyUsers.map(u => ({
        userId: u.user_id,
        distance: calculateDistance(myLocation.latitude, myLocation.longitude, u.latitude, u.longitude),
        radius: u.radius_km,
      })),
      theirWishlistsCount: theirWishlists?.length || 0,
      theirCollectionsCount: theirCollections?.length || 0,
      // Sample data structure
      sampleMyWishlist: myWishlist?.[0] || null,
      sampleTheirCollection: theirCollections?.[0] || null,
    }

    console.log('Debug matching:', debugInfo)

    // In debug mode, return diagnostic info without saving matches
    if (debugMode) {
      return NextResponse.json({
        debug: true,
        ...debugInfo,
        myWishlist: myWishlist?.map(w => ({
          cardName: w.cards?.name,
          oracleId: w.cards?.oracle_id,
          minCondition: w.min_condition,
          foilPreference: w.foil_preference,
          editionPreference: w.edition_preference,
          specificEditions: w.specific_editions,
        })),
        myCollection: myCollection?.map(c => ({
          cardName: c.cards?.name,
          oracleId: c.cards?.oracle_id,
          condition: c.condition,
          foil: c.foil,
        })),
        theirCollections: theirCollections?.map(c => ({
          userId: c.user_id,
          cardName: c.cards?.name,
          oracleId: c.cards?.oracle_id,
          condition: c.condition,
          foil: c.foil,
        })),
        theirWishlists: theirWishlists?.map(w => ({
          userId: w.user_id,
          cardName: w.cards?.name,
          oracleId: w.cards?.oracle_id,
          minCondition: w.min_condition,
          foilPreference: w.foil_preference,
          editionPreference: w.edition_preference,
          specificEditions: w.specific_editions,
        })),
      })
    }

    // Group by user
    const wishlistByUser = new Map<string, WishlistItem[]>()
    const collectionByUser = new Map<string, CollectionItem[]>()

    theirWishlists?.forEach(w => {
      if (!wishlistByUser.has(w.user_id)) wishlistByUser.set(w.user_id, [])
      wishlistByUser.get(w.user_id)!.push(w)
    })

    theirCollections?.forEach(c => {
      if (!collectionByUser.has(c.user_id)) collectionByUser.set(c.user_id, [])
      collectionByUser.get(c.user_id)!.push(c)
    })

    // Get existing matches that should be preserved (user-modified or in progress)
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, is_user_modified, status')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

    // Track which user pairs have preserved matches
    const preservedPairs = new Set<string>()
    const matchesToDelete: string[] = []

    existingMatches?.forEach(m => {
      // Preserve matches that are user-modified or have active trade flow
      const shouldPreserve = m.is_user_modified ||
        ['requested', 'confirmed', 'completed', 'cancelled'].includes(m.status)

      if (shouldPreserve) {
        // Create a consistent key for the pair
        const pairKey = [m.user_a_id, m.user_b_id].sort().join('-')
        preservedPairs.add(pairKey)
      } else {
        matchesToDelete.push(m.id)
      }
    })

    // Delete only non-preserved matches
    if (matchesToDelete.length > 0) {
      await supabase.from('matches').delete().in('id', matchesToDelete)
    }

    // Get collection IDs that are in escrow (confirmed matches)
    const { data: escrowedCards } = await supabase
      .from('match_cards')
      .select('collection_id, match_id, matches!inner(status)')
      .eq('is_excluded', false)
      .eq('matches.status', 'confirmed')

    const escrowedCollectionIds = new Set(escrowedCards?.map(c => c.collection_id) || [])

    // Compute matches for each nearby user
    const newMatches = []

    for (const otherUser of nearbyUsers) {
      const otherUserId = otherUser.user_id

      // Skip if we already have a preserved match with this user
      const pairKey = [user.id, otherUserId].sort().join('-')
      if (preservedPairs.has(pairKey)) {
        continue
      }

      const theirWishlist = wishlistByUser.get(otherUserId) || []
      // Filter out escrowed collection items
      const theirCollection = (collectionByUser.get(otherUserId) || [])
        .filter(c => !escrowedCollectionIds.has(c.id))

      // Cards I want that they have
      const cardsIWant: {
        wishlistItem: WishlistItem
        collectionItem: CollectionItem
        askingPrice: number | null
        priceExceedsMax: boolean
      }[] = []

      // Cards they want that I have
      const cardsTheyWant: {
        wishlistItem: WishlistItem
        collectionItem: CollectionItem
        askingPrice: number | null
        priceExceedsMax: boolean
      }[] = []

      // Check what I want from their collection
      if (myWishlist && theirCollection.length > 0) {
        // Debug: log first items to see structure
        if (myWishlist.length > 0 && theirCollection.length > 0) {
          console.log('Debug wishItem structure:', JSON.stringify(myWishlist[0], null, 2))
          console.log('Debug collItem structure:', JSON.stringify(theirCollection[0], null, 2))
        }

        for (const wishItem of myWishlist) {
          for (const collItem of theirCollection) {
            // Match by oracle_id (same card, any edition by default)
            const wishOracleId = wishItem.cards?.oracle_id
            const collOracleId = collItem.cards?.oracle_id

            if (!wishOracleId || !collOracleId) {
              console.log('Missing oracle_id:', { wishOracleId, collOracleId, wishItem, collItem })
              continue
            }

            if (wishOracleId !== collOracleId) continue

            // Check edition preference
            if (!editionMatches(
              collItem.cards.scryfall_id,
              wishItem.edition_preference,
              wishItem.specific_editions || []
            )) continue

            // Check condition
            if (!conditionMeetsMinimum(collItem.condition, wishItem.min_condition)) continue

            // Check foil preference
            if (!foilMatches(collItem.foil, wishItem.foil_preference)) continue

            // Calculate asking price
            const askingPrice = calculateAskingPrice(
              collItem.price_mode,
              collItem.price_percentage,
              collItem.price_fixed,
              collItem.cards.prices_usd,
              collItem.foil,
              collItem.cards.prices_usd_foil
            )

            // Check price
            const priceExceedsMax = wishItem.max_price !== null &&
              askingPrice !== null &&
              askingPrice > wishItem.max_price

            cardsIWant.push({
              wishlistItem: wishItem,
              collectionItem: collItem,
              askingPrice,
              priceExceedsMax,
            })
          }
        }
      }

      // Check what they want from my collection (excluding escrowed items)
      const myAvailableCollection = myCollection?.filter(c => !escrowedCollectionIds.has(c.id)) || []
      if (myAvailableCollection.length > 0 && theirWishlist.length > 0) {
        for (const wishItem of theirWishlist) {
          for (const collItem of myAvailableCollection) {
            const wishOracleId = wishItem.cards?.oracle_id
            const collOracleId = collItem.cards?.oracle_id

            if (!wishOracleId || !collOracleId) continue
            if (wishOracleId !== collOracleId) continue

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

            cardsTheyWant.push({
              wishlistItem: wishItem,
              collectionItem: collItem,
              askingPrice,
              priceExceedsMax,
            })
          }
        }
      }

      // Skip if no matches
      if (cardsIWant.length === 0 && cardsTheyWant.length === 0) continue

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
        otherUser.latitude,
        otherUser.longitude
      )

      // Check for price warnings
      const hasPriceWarnings = cardsIWant.some(c => c.priceExceedsMax) ||
        cardsTheyWant.some(c => c.priceExceedsMax)

      // Calculate price efficiency (average ratio of asking to max price)
      let priceEfficiency = 0.5 // default if no max prices set
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

      // Ensure consistent ordering (lower UUID first)
      const [userAId, userBId] = user.id < otherUserId
        ? [user.id, otherUserId]
        : [otherUserId, user.id]

      // Adjust counts based on ordering
      const [aWantsCount, bWantsCount] = user.id < otherUserId
        ? [cardsIWant.length, cardsTheyWant.length]
        : [cardsTheyWant.length, cardsIWant.length]

      const [valueAWants, valueBWants] = user.id < otherUserId
        ? [valueIWant, valueTheyWant]
        : [valueTheyWant, valueIWant]

      // Insert match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          user_a_id: userAId,
          user_b_id: userBId,
          match_type: matchType,
          distance_km: distance,
          cards_a_wants_count: aWantsCount,
          cards_b_wants_count: bWantsCount,
          value_a_wants: valueAWants,
          value_b_wants: valueBWants,
          match_score: matchScore,
          has_price_warnings: hasPriceWarnings,
          status: 'active',
        })
        .select()
        .single()

      if (matchError) {
        console.error('Error inserting match:', matchError)
        continue
      }

      // Insert match cards
      const matchCards = []

      for (const card of cardsIWant) {
        matchCards.push({
          match_id: match.id,
          direction: user.id < otherUserId ? 'a_wants' : 'b_wants',
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
        })
      }

      for (const card of cardsTheyWant) {
        matchCards.push({
          match_id: match.id,
          direction: user.id < otherUserId ? 'b_wants' : 'a_wants',
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
        })
      }

      if (matchCards.length > 0) {
        await supabase.from('match_cards').insert(matchCards)
      }

      newMatches.push({
        id: match.id,
        otherUserId,
        matchType,
        cardsIWant: cardsIWant.length,
        cardsTheyWant: cardsTheyWant.length,
        distance,
        score: matchScore,
      })
    }

    // Sort by score
    newMatches.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      matches: newMatches,
      total: newMatches.length,
    })
  } catch (error) {
    console.error('Compute matches error:', error)
    return NextResponse.json(
      { error: 'Error al calcular trades' },
      { status: 500 }
    )
  }
}
