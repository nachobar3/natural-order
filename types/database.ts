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
  rarity: string
  type_line: string
  mana_cost?: string
  colors?: string[]
  color_identity?: string[]
  cmc: number
  legalities: Record<string, string>
  released_at: string
}
