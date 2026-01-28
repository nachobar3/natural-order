export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Simplified Database type - will be regenerated from Supabase later
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          preferred_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string | null
          latitude: number
          longitude: number
          radius_km: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          latitude: number
          longitude: number
          radius_km?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          latitude?: number
          longitude?: number
          radius_km?: number
          is_active?: boolean
          created_at?: string
        }
      }
      preferences: {
        Row: {
          id: string
          user_id: string
          trade_mode: 'trade' | 'sell' | 'both'
          min_match_threshold: number
          availability: Json | null
          notify_new_matches: boolean
          notify_messages: boolean
          default_price_percentage: number
          minimum_price: number
          collection_paused: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trade_mode?: 'trade' | 'sell' | 'both'
          min_match_threshold?: number
          availability?: Json | null
          notify_new_matches?: boolean
          notify_messages?: boolean
          default_price_percentage?: number
          minimum_price?: number
          collection_paused?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trade_mode?: 'trade' | 'sell' | 'both'
          min_match_threshold?: number
          availability?: Json | null
          notify_new_matches?: boolean
          notify_messages?: boolean
          default_price_percentage?: number
          minimum_price?: number
          collection_paused?: boolean
          created_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          scryfall_id: string
          oracle_id: string
          name: string
          set_code: string
          set_name: string
          collector_number: string | null
          image_uri: string | null
          image_uri_small: string | null
          prices_usd: number | null
          prices_usd_foil: number | null
          rarity: string | null
          type_line: string | null
          mana_cost: string | null
          colors: string[] | null
          color_identity: string[] | null
          cmc: number | null
          legalities: Json | null
          released_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          scryfall_id: string
          oracle_id: string
          name: string
          set_code: string
          set_name: string
          collector_number?: string | null
          image_uri?: string | null
          image_uri_small?: string | null
          prices_usd?: number | null
          prices_usd_foil?: number | null
          rarity?: string | null
          type_line?: string | null
          mana_cost?: string | null
          colors?: string[] | null
          color_identity?: string[] | null
          cmc?: number | null
          legalities?: Json | null
          released_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          scryfall_id?: string
          oracle_id?: string
          name?: string
          set_code?: string
          set_name?: string
          collector_number?: string | null
          image_uri?: string | null
          image_uri_small?: string | null
          prices_usd?: number | null
          prices_usd_foil?: number | null
          rarity?: string | null
          type_line?: string | null
          mana_cost?: string | null
          colors?: string[] | null
          color_identity?: string[] | null
          cmc?: number | null
          legalities?: Json | null
          released_at?: string | null
          updated_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          user_id: string
          card_id: string
          quantity: number
          condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
          foil: boolean
          price_mode: 'percentage' | 'fixed'
          price_percentage: number
          price_fixed: number | null
          price_override: boolean
          is_paused: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          quantity?: number
          condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
          foil?: boolean
          price_mode?: 'percentage' | 'fixed'
          price_percentage?: number
          price_fixed?: number | null
          price_override?: boolean
          is_paused?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string
          quantity?: number
          condition?: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
          foil?: boolean
          price_mode?: 'percentage' | 'fixed'
          price_percentage?: number
          price_fixed?: number | null
          price_override?: boolean
          is_paused?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wishlist: {
        Row: {
          id: string
          user_id: string
          card_id: string | null
          oracle_id: string | null
          quantity: number
          max_price: number | null
          min_condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
          foil_preference: 'any' | 'foil_only' | 'non_foil'
          priority: number
          edition_preference: 'any' | 'specific'
          specific_editions: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id?: string | null
          oracle_id?: string | null
          quantity?: number
          max_price?: number | null
          min_condition?: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
          foil_preference?: 'any' | 'foil_only' | 'non_foil'
          priority?: number
          edition_preference?: 'any' | 'specific'
          specific_editions?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string | null
          oracle_id?: string | null
          quantity?: number
          max_price?: number | null
          min_condition?: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
          foil_preference?: 'any' | 'foil_only' | 'non_foil'
          priority?: number
          edition_preference?: 'any' | 'specific'
          specific_editions?: string[]
          created_at?: string
        }
      }
      match_comments: {
        Row: {
          id: string
          match_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'trade_requested' | 'trade_confirmed' | 'trade_completed' | 'trade_cancelled' | 'match_modified' | 'new_comment' | 'request_invalidated' | 'escrow_expiring'
          match_id: string | null
          from_user_id: string | null
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'trade_requested' | 'trade_confirmed' | 'trade_completed' | 'trade_cancelled' | 'match_modified' | 'new_comment' | 'request_invalidated' | 'escrow_expiring'
          match_id?: string | null
          from_user_id?: string | null
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'trade_requested' | 'trade_confirmed' | 'trade_completed' | 'trade_cancelled' | 'match_modified' | 'new_comment' | 'request_invalidated' | 'escrow_expiring'
          match_id?: string | null
          from_user_id?: string | null
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      // Allow any table for flexibility during development
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      trade_mode: 'trade' | 'sell' | 'both'
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type Preferences = Database['public']['Tables']['preferences']['Row']
export type Card = Database['public']['Tables']['cards']['Row']
export type Collection = Database['public']['Tables']['collections']['Row']
export type Wishlist = Database['public']['Tables']['wishlist']['Row']

// Extended types with relations
export type CollectionWithCard = Collection & {
  cards: Card
}

export type WishlistWithCard = Wishlist & {
  cards: Card | null
}

// Card condition type
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'

// Match types
export type MatchType = 'two_way' | 'one_way_buy' | 'one_way_sell'
export type MatchStatus = 'active' | 'dismissed' | 'contacted' | 'requested' | 'confirmed' | 'completed' | 'cancelled'

// Notification types
export type NotificationType =
  | 'new_match'
  | 'trade_requested'
  | 'trade_confirmed'
  | 'trade_completed'
  | 'trade_cancelled'
  | 'trade_rejected'
  | 'match_modified'
  | 'new_comment'
  | 'request_invalidated'
  | 'escrow_reminder'

export interface MatchCardPreview {
  name: string
  setCode: string
  price: number | null
}

export interface Match {
  id: string
  otherUser: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  matchType: MatchType
  distanceKm: number | null
  cardsIWant: number
  cardsTheyWant: number
  cardsIWantList: MatchCardPreview[]
  cardsTheyWantList: MatchCardPreview[]
  valueIWant: number
  valueTheyWant: number
  matchScore: number
  avgDiscountPercent: number | null
  hasPriceWarnings: boolean
  isFavorite: boolean
  status: MatchStatus
  createdAt: string
  updatedAt: string
  // New trading fields
  isUserModified: boolean
  requestedBy: string | null
  requestedAt: string | null
  confirmedAt: string | null
  escrowExpiresAt: string | null
  hasConflict: boolean
  // Perspective-aware fields (set based on current user)
  iRequested: boolean
  theyRequested: boolean
  iCompleted: boolean | null
  theyCompleted: boolean | null
}

export interface MatchCard {
  id: string
  cardId: string
  cardName: string
  cardSetCode: string
  cardImageUri: string | null
  askingPrice: number | null
  maxPrice: number | null
  priceExceedsMax: boolean
  condition: CardCondition
  minCondition: CardCondition
  isFoil: boolean
  quantityAvailable: number
  quantityWanted: number
  isExcluded: boolean
  isCustom: boolean
  addedByUserId: string | null
}

export interface MatchDetail extends Omit<Match, 'cardsIWant' | 'cardsTheyWant' | 'valueIWant' | 'valueTheyWant' | 'updatedAt' | 'otherUser'> {
  otherUser: {
    id: string
    displayName: string
    avatarUrl: string | null
    location: {
      latitude: number
      longitude: number
    } | null
  }
  cardsIWant: MatchCard[]
  cardsTheyWant: MatchCard[]
  totalValueIWant: number
  totalValueTheyWant: number
}

// Match comments (chat between users)
export interface MatchComment {
  id: string
  matchId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  // Populated from join
  user?: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

// Notifications
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  matchId: string | null
  fromUserId: string | null
  content: string
  isRead: boolean
  createdAt: string
  // Populated from joins
  match?: {
    id: string
    otherUser: {
      id: string
      displayName: string
      avatarUrl: string | null
    }
  }
  fromUser?: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

// Scryfall API types
export interface ScryfallCard {
  id: string
  oracle_id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  image_uris?: {
    normal?: string
    small?: string
  }
  card_faces?: Array<{
    image_uris?: {
      normal?: string
      small?: string
    }
  }>
  prices: {
    usd?: string | null
    usd_foil?: string | null
  }
  finishes?: string[] // e.g., ['nonfoil'], ['foil'], ['nonfoil', 'foil'], ['etched']
  rarity: string
  type_line: string
  mana_cost?: string
  colors?: string[]
  color_identity?: string[]
  cmc: number
  legalities: Record<string, string>
  released_at: string
}
