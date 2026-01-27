# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Natural Order** is a proximity-based marketplace for Magic: The Gathering card trading. It automatically matches users based on their collections, wishlists, and geographic location.

**Core Value Proposition:**
- Find nearby users who have cards you want AND want cards you have
- Automatic matching algorithm with scoring
- Reference pricing from Scryfall market data
- Full trade lifecycle management (request → confirm → complete)

**Status:** MVP Complete - Pre-Launch (January 2026)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **Card Data** | Scryfall API |
| **Location** | Google Maps Geocoding API |
| **Hosting** | Vercel (auto-deploy on push to master) |
| **Caching** | SWR (client-side), HTTP Cache-Control |
| **Rate Limiting** | Upstash Redis |

---

## Supabase Project

- **Project Name:** Natural Order
- **Project ID:** `yytguwptqcdnmglinbvw`
- **Region:** us-east-2
- **Database Host:** `db.yytguwptqcdnmglinbvw.supabase.co`

### Database Schema (Core Tables)

```
users (35 rows)
├── id (UUID, PK, = auth.users.id)
├── email, display_name, avatar_url
└── preferred_language ('es' | 'en')

locations (32 rows)
├── user_id (FK, unique per user)
├── latitude, longitude, address
├── radius_km (1-100, default 10)
└── is_active (boolean)

preferences (35 rows)
├── user_id (FK, unique)
├── trade_mode ('trade' | 'sell' | 'buy' | 'both')
├── default_price_percentage (1-200, default 80)
├── minimum_price (decimal)
└── has_been_configured (boolean)

cards (951 rows) - Synced from Scryfall
├── scryfall_id (unique), oracle_id
├── name, set_code, set_name
├── prices_usd, prices_usd_foil
└── image_uri, rarity, type_line, colors

collections (2157 rows) - User's cards for sale/trade
├── user_id, card_id (FKs)
├── quantity, condition (NM/LP/MP/HP/DMG), foil
├── price_mode ('percentage' | 'fixed')
├── price_percentage, price_fixed
└── price_override (boolean)

wishlist (546 rows) - Cards user wants
├── user_id, card_id, oracle_id
├── quantity, max_price, priority (1-10)
├── min_condition, foil_preference ('any'|'foil_only'|'non_foil')
├── edition_preference ('any' | 'specific')
└── specific_editions (text[])

matches (19 rows) - Computed trading opportunities
├── user_a_id, user_b_id (lower UUID first)
├── match_type ('two_way' | 'one_way_buy' | 'one_way_sell')
├── distance_km, match_score
├── cards_a_wants_count, cards_b_wants_count
├── value_a_wants, value_b_wants
├── status ('active'|'dismissed'|'contacted'|'requested'|'confirmed'|'completed'|'cancelled')
├── is_user_modified, is_favorite_a, is_favorite_b
└── requested_by, confirmed_at, escrow_expires_at

match_cards (265 rows) - Cards in each match
├── match_id, direction ('a_wants' | 'b_wants')
├── wishlist_id, collection_id, card_id
├── asking_price, max_price, price_exceeds_max
├── is_excluded (user removed from trade)
└── is_custom (manually added card)

match_comments - Chat between users
notifications - Trade event notifications
push_subscriptions - Web Push subscriptions
```

---

## Matching Algorithm (Core Logic)

Location: `lib/matching.ts` and `app/api/matches/compute/route.ts`

### When Matches Are Computed
- **On-demand** via `POST /api/matches/compute`
- Triggered by "Buscar trades" button in dashboard
- NOT computed automatically on schedule

### Algorithm Flow
1. Verify user authentication
2. Get user's active location (lat/lng/radius)
3. Fetch user's wishlist and collection
4. Find nearby users (Haversine formula)
   - Within MY radius OR within THEIR radius
5. For each nearby user:
   - Find cards I want from their collection
   - Find cards they want from my collection
   - Match by `oracle_id` (same card, any edition)
   - Check: condition >= min_condition
   - Check: foil_preference matches
   - Check: edition_preference (any/specific)
   - Calculate asking_price, flag if > max_price
6. Determine match type (two_way, one_way_buy, one_way_sell)
7. Filter by user's trade_mode preference
8. Calculate match score
9. Save to `matches` and `match_cards` tables
10. Clean up stale non-protected matches

### Match Score Calculation (0-100+ points)
```typescript
- Match Type Bonus (0-30 pts): two_way=30, one_way_buy=15, one_way_sell=10
- Card Count Bonus (0-25 pts): totalCards * 2.5, capped
- Value Bonus (0-20 pts): totalValue / 10, capped at $200
- Distance Bonus (0-15 pts): 15 - (distance_km / 3.33)
- Price Efficiency Bonus (0-25 pts): lower prices = better
- Price Warning Penalty: -5 pts if any card exceeds max_price
```

### Card Matching Criteria
| Criterion | Logic |
|-----------|-------|
| Card Identity | `oracle_id` must match |
| Edition | If 'specific', scryfall_id in specific_editions |
| Condition | collection >= wishlist min (NM > LP > MP > HP > DMG) |
| Foil | Must match preference (any/foil_only/non_foil) |
| Price | Flagged (not excluded) if asking > max_price |

### Match Preservation Rules
- **Preserved on recompute:** requested, confirmed, completed, cancelled, is_user_modified=true
- **Deleted on recompute:** active, dismissed, contacted (unless user modified)

---

## Project Structure

```
app/
├── (auth)/               # Auth pages (login, register, forgot-password, reset-password)
├── api/
│   ├── cards/            # Card search, bulk-import, printings
│   ├── matches/          # Match CRUD, compute, comments
│   │   ├── compute/      # POST - Run matching algorithm
│   │   └── [id]/         # Match details, request, confirm, complete
│   ├── preferences/      # Global discount
│   ├── push/             # Push notification subscriptions
│   └── user/             # User profile
├── dashboard/
│   ├── collection/       # User's collection + import
│   ├── wishlist/         # User's wishlist + import
│   ├── matches/[id]/     # Match detail page
│   ├── profile/          # User settings
│   ├── notifications/    # Notification center
│   └── faqs/             # Help page
└── page.tsx              # Root redirect

components/
├── ui/                   # Reusable UI (button, input, modal, nav)
├── cards/                # Card search, add modal, edition selector
├── collection/           # Global discount component
├── matches/              # Counterpart collection drawer
└── pwa/                  # Install prompt, push prompt

lib/
├── matching.ts           # Matching algorithm utilities
├── supabase/             # Supabase client (server, client, middleware)
├── csv-parser.ts         # Bulk import parser (Moxfield, ManaBox, Deckbox, etc.)
├── rate-limit.ts         # Upstash rate limiting
├── push-notifications.ts # Web Push utilities
└── hooks/                # Custom React hooks (useMatches, useDebounce, etc.)

supabase/
└── migrations/           # SQL migrations (run in Supabase SQL Editor)

tests/
├── e2e/                  # Playwright E2E tests
└── load/                 # k6 stress tests
```

---

## Key API Endpoints

### Matching
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matches/compute` | Run matching algorithm |
| GET | `/api/matches` | List matches (with filters) |
| GET | `/api/matches/[id]` | Match details |
| PATCH | `/api/matches/[id]` | Update match |
| POST | `/api/matches/[id]/request` | Request trade |
| POST | `/api/matches/[id]/confirm` | Confirm trade |
| POST | `/api/matches/[id]/complete` | Mark completed |

### Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/search?q=` | Search Scryfall |
| GET | `/api/cards/printings?name=` | Get all printings |
| POST | `/api/cards/bulk-import` | Import collection CSV |
| POST | `/api/cards/bulk-import-wishlist` | Import wishlist CSV |

---

## Trade Flow / Status Lifecycle

```
ACTIVE → DISMISSED (can restore)
       → CONTACTED (informational)
       → REQUESTED (by one user)
           → CANCELLED (either user)
           → CONFIRMED (other user accepts)
               → COMPLETED (both mark done)
```

When a match is **CONFIRMED**, the cards go into "escrow" - they're excluded from other matches until trade completes or cancels.

---

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Development server (localhost:3000)
npm run build         # Production build (also runs type checking)
npm run lint          # ESLint
npm run test          # Playwright E2E tests
npm run test:ui       # Playwright with UI
npm run test:headed   # Playwright headed mode

# Load testing (k6 required)
k6 run tests/load/stress-test.js
k6 run -e BASE_URL=https://natural-order.vercel.app tests/load/stress-test.js
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://yytguwptqcdnmglinbvw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[maps-key]
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[vapid-public]
VAPID_PRIVATE_KEY=[vapid-private]
UPSTASH_REDIS_REST_URL=[redis-url]
UPSTASH_REDIS_REST_TOKEN=[redis-token]
```

---

## Code Conventions

### Language
- **UI Text:** Spanish (es) - all user-facing text is in Spanish
- **Code/Comments:** English preferred for code, Spanish acceptable for comments

### Patterns
- **Data Fetching:** SWR for client-side, with `revalidateOnFocus: true`
- **Auth:** Always use `createClient()` from `lib/supabase/server.ts` in API routes
- **Errors:** Return Spanish error messages for user-facing errors
- **Pricing:** Always calculate via `calculateAskingPrice()` utility
- **Distance:** Use `calculateDistance()` (Haversine formula)

### Important Files to Know
- `lib/matching.ts` - Core matching utilities
- `app/api/matches/compute/route.ts` - Main matching algorithm
- `lib/csv-parser.ts` - Bulk import logic (supports Moxfield, ManaBox, Deckbox, CubeCobra)
- `app/dashboard/layout.tsx` - Dashboard shell with navigation
- `components/ui/bottom-nav.tsx` - Mobile navigation

---

## Business Context

### Target Market
- **Primary:** MTG traders in Latin America (Argentina, Chile, Mexico, Peru)
- **Pain Point:** 70% frustrated with current trading coordination (Facebook groups, WhatsApp)
- **Differentiator:** Proximity-based matching + automatic discovery

### Monetization Model (Planned)
- Free: 2 trades/month
- Pay-per-trade: $1/trade beyond free tier
- Premium: $3/month unlimited


---

## Filosofia de Desarrollo

- Mobile-first, responsive design
- Dark theme support (Tailwind dark: classes)
- PWA-ready (installable, offline-capable)
- Codigo limpio y comentado
- Pedir confirmacion antes de hacer cambios grandes o crear multiples archivos
- Preferir editar archivos existentes sobre crear nuevos
