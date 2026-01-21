// Matching algorithm utilities

// Condition hierarchy: NM > LP > MP > HP > DMG
const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const
type Condition = typeof CONDITION_ORDER[number]

export function conditionMeetsMinimum(
  collectionCondition: Condition,
  wishlistMinCondition: Condition
): boolean {
  const collectionIndex = CONDITION_ORDER.indexOf(collectionCondition)
  const minIndex = CONDITION_ORDER.indexOf(wishlistMinCondition)
  // Lower index = better condition
  return collectionIndex <= minIndex
}

export function foilMatches(
  collectionFoil: boolean,
  wishlistPreference: 'any' | 'foil_only' | 'non_foil'
): boolean {
  if (wishlistPreference === 'any') return true
  if (wishlistPreference === 'foil_only') return collectionFoil
  if (wishlistPreference === 'non_foil') return !collectionFoil
  return true
}

export function editionMatches(
  collectionScryfallId: string,
  wishlistEditionPreference: 'any' | 'specific',
  wishlistSpecificEditions: string[]
): boolean {
  if (wishlistEditionPreference === 'any') return true
  return wishlistSpecificEditions.includes(collectionScryfallId)
}

// Calculate match score
// Higher score = better match
export function calculateMatchScore(params: {
  matchType: 'two_way' | 'one_way_buy' | 'one_way_sell'
  cardsAWantsCount: number
  cardsBWantsCount: number
  valueAWants: number
  valueBWants: number
  distanceKm: number | null
  hasPriceWarnings: boolean
  // Price efficiency: how much below max_price the actual prices are
  priceEfficiency: number // 0-1, where 1 = at max_price, 0.5 = at 50% of max
}): number {
  let score = 0

  // Match type bonus (0-30 points)
  if (params.matchType === 'two_way') {
    score += 30 // Best: mutual benefit
  } else if (params.matchType === 'one_way_buy') {
    score += 15 // Good: I can get cards I want
  } else {
    score += 10 // Okay: I can sell cards
  }

  // Card count bonus (0-25 points)
  const totalCards = params.cardsAWantsCount + params.cardsBWantsCount
  score += Math.min(totalCards * 2.5, 25)

  // Value bonus (0-20 points)
  const totalValue = params.valueAWants + params.valueBWants
  score += Math.min(totalValue / 10, 20) // $200+ value = max bonus

  // Distance penalty (0-15 points, closer = better)
  if (params.distanceKm !== null) {
    // 0km = 15 points, 25km = ~7 points, 50km+ = 0 points
    score += Math.max(0, 15 - (params.distanceKm / 3.33))
  }

  // Price efficiency bonus (0-10 points)
  // Lower prices relative to max = better
  score += (1 - params.priceEfficiency) * 10

  // Price warning penalty
  if (params.hasPriceWarnings) {
    score -= 5
  }

  return Math.round(score * 100) / 100
}

// Calculate distance using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Calculate asking price from collection item
export function calculateAskingPrice(
  priceMode: 'percentage' | 'fixed',
  pricePercentage: number,
  priceFixed: number | null,
  basePrice: number | null,
  isFoil: boolean,
  foilPrice: number | null
): number | null {
  const price = isFoil ? foilPrice : basePrice

  if (priceMode === 'fixed' && priceFixed !== null) {
    return priceFixed
  }

  if (price === null) return null

  return Math.round(price * (pricePercentage / 100) * 100) / 100
}
