# Natural Order - MVP Release Documentation

**Version:** 1.0.0
**Last Updated:** January 25, 2026
**Status:** MVP Complete - Pre-Launch

---

## 1. Product Overview

Natural Order is a proximity-based marketplace for Magic: The Gathering card trading. It automatically matches users based on their collections, wishlists, and geographic location.

### Core Value Proposition

- **For traders:** Find nearby users who have cards you want and want cards you have
- **For buyers:** Discover local sellers with cards on your wishlist
- **For sellers:** Reach local buyers without shipping hassles
- **Differentiator:** Automatic matching + proximity awareness + reference pricing

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Card Data | Scryfall API |
| Location | Google Maps Geocoding API |
| Hosting | Vercel |
| Caching | SWR (client), HTTP Cache-Control headers |
| Rate Limiting | Upstash Redis |

---

## 2. Matching Algorithm

The matching algorithm is the core of Natural Order. It runs on-demand when a user triggers computation and finds compatible trading opportunities with nearby users.

### 2.1 When Matches Are Computed

Matches are computed **on-demand** via `POST /api/matches/compute` when:
- User clicks "Buscar trades" button in the dashboard
- User returns to the app after adding cards to collection/wishlist

Matches are **NOT** computed automatically on a schedule.

### 2.2 Algorithm Flow

```
1. AUTHENTICATION
   └── Verify user is logged in

2. LOCATION CHECK
   └── Get user's active location (latitude, longitude, radius_km)
   └── If no location → return error "Configure tu ubicación"

3. USER DATA FETCH
   ├── Get user's wishlist (cards they want)
   ├── Get user's collection (cards they have)
   └── Get user's trade_mode preference

4. FIND NEARBY USERS
   ├── Get all other users' active locations
   ├── Calculate distance using Haversine formula
   └── Filter: distance <= myRadius OR distance <= theirRadius

5. FETCH NEARBY USER DATA
   ├── Get their wishlists
   └── Get their collections (excluding escrowed cards)

6. FOR EACH NEARBY USER:
   │
   ├── CARDS I WANT (from their collection)
   │   └── Match by oracle_id (same card, any edition)
   │   └── Check: edition_preference (any/specific)
   │   └── Check: condition >= min_condition
   │   └── Check: foil_preference (any/foil_only/non_foil)
   │   └── Calculate asking_price
   │   └── Flag if price > max_price
   │
   ├── CARDS THEY WANT (from my collection)
   │   └── Same matching logic as above
   │
   ├── DETERMINE MATCH TYPE
   │   ├── two_way: both users have cards the other wants
   │   ├── one_way_buy: I can buy from them (I want, they don't)
   │   └── one_way_sell: I can sell to them (they want, I don't)
   │
   ├── FILTER BY TRADE MODE
   │   ├── trade: only two_way matches
   │   ├── sell: exclude one_way_buy
   │   ├── buy: exclude one_way_sell
   │   └── both: include all
   │
   ├── CALCULATE MATCH SCORE
   │   └── See section 2.3
   │
   └── SAVE TO DATABASE
       ├── Insert into `matches` table
       └── Insert cards into `match_cards` table

7. CLEANUP
   └── Delete old non-preserved matches (active/dismissed/contacted)
   └── Preserve: user-modified, requested, confirmed, completed, cancelled

8. RETURN
   └── List of new matches sorted by score
```

### 2.3 Match Score Calculation

The score (0-100+ points) determines match ranking. Higher = better opportunity.

```typescript
Score Components:
├── Match Type Bonus (0-30 pts)
│   ├── two_way:      30 pts (mutual benefit)
│   ├── one_way_buy:  15 pts (I can get cards)
│   └── one_way_sell: 10 pts (I can sell cards)
│
├── Card Count Bonus (0-25 pts)
│   └── totalCards * 2.5, capped at 25
│
├── Value Bonus (0-20 pts)
│   └── totalValue / 10, capped at 20 ($200+ = max)
│
├── Distance Bonus (0-15 pts)
│   └── 15 - (distance_km / 3.33)
│   └── 0km = 15pts, 25km = ~7pts, 50km+ = 0pts
│
├── Price Efficiency Bonus (0-25 pts)
│   └── (1 - priceEfficiency) * 25
│   └── Lower prices relative to max = better
│
└── Price Warning Penalty
    └── -5 pts if any card exceeds max_price
```

### 2.4 Card Matching Criteria

For a card to match between wishlist and collection:

| Criterion | Logic |
|-----------|-------|
| **Card Identity** | `oracle_id` must match (same card, any printing) |
| **Edition** | If `edition_preference = 'specific'`, scryfall_id must be in specific_editions |
| **Condition** | Collection condition must be >= wishlist min_condition (NM > LP > MP > HP > DMG) |
| **Foil** | Must match `foil_preference` (any / foil_only / non_foil) |
| **Price** | Flagged (not excluded) if asking_price > max_price |

### 2.5 Match Preservation Rules

When re-computing matches, some are preserved:

| Status | Preserved? | Reason |
|--------|------------|--------|
| `active` | No | Can be recomputed |
| `dismissed` | No | Can be recomputed |
| `contacted` | No | Can be recomputed |
| `requested` | Yes | Trade in progress |
| `confirmed` | Yes | Trade confirmed |
| `completed` | Yes | Historical record |
| `cancelled` | Yes | Historical record |
| `is_user_modified = true` | Yes | User customized the trade |

---

## 3. Database Schema

### 3.1 Core Tables

#### `users`
User profiles (auto-created on signup via trigger).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (= auth.users.id) |
| email | TEXT | User email |
| display_name | TEXT | Display name |
| avatar_url | TEXT | Profile picture URL |
| preferred_language | TEXT | 'es' or 'en' |

#### `locations`
User locations for proximity matching.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| name | TEXT | Location name |
| latitude | DOUBLE | GPS latitude |
| longitude | DOUBLE | GPS longitude |
| radius_km | INTEGER | Search radius (1-100) |
| is_active | BOOLEAN | Active location flag |

#### `preferences`
User trading preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| trade_mode | ENUM | 'trade', 'sell', 'buy', 'both' |
| has_been_configured | BOOLEAN | User has saved preferences |
| notify_new_matches | BOOLEAN | Push notification setting |

#### `cards`
Card data synced from Scryfall.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| scryfall_id | TEXT | Scryfall unique ID |
| oracle_id | TEXT | Oracle ID (same card, any printing) |
| name | TEXT | Card name |
| set_code | TEXT | Set code (e.g., 'MH2') |
| prices_usd | DECIMAL | Market price (non-foil) |
| prices_usd_foil | DECIMAL | Market price (foil) |

#### `collections`
User's cards for sale/trade.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| card_id | UUID | Foreign key to cards |
| quantity | INTEGER | Number of copies |
| condition | TEXT | NM/LP/MP/HP/DMG |
| foil | BOOLEAN | Foil flag |
| price_mode | TEXT | 'percentage' or 'fixed' |
| price_percentage | INTEGER | % of market price |
| price_fixed | DECIMAL | Fixed price override |

#### `wishlist`
Cards user wants to acquire.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| card_id | UUID | Foreign key to cards |
| oracle_id | TEXT | For any-edition matching |
| quantity | INTEGER | Copies wanted |
| max_price | DECIMAL | Maximum price willing to pay |
| min_condition | TEXT | Minimum acceptable condition |
| foil_preference | TEXT | 'any', 'foil_only', 'non_foil' |
| edition_preference | TEXT | 'any' or 'specific' |
| specific_editions | TEXT[] | Allowed scryfall_ids if specific |
| priority | INTEGER | 1-10 priority level |

### 3.2 Match Tables

#### `matches`
Computed trading opportunities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_a_id | UUID | First user (lower UUID) |
| user_b_id | UUID | Second user (higher UUID) |
| match_type | TEXT | 'two_way', 'one_way_buy', 'one_way_sell' |
| distance_km | DECIMAL | Distance between users |
| cards_a_wants_count | INTEGER | Cards user_a wants |
| cards_b_wants_count | INTEGER | Cards user_b wants |
| value_a_wants | DECIMAL | Total value user_a wants |
| value_b_wants | DECIMAL | Total value user_b wants |
| match_score | DECIMAL | Ranking score |
| has_price_warnings | BOOLEAN | Any card exceeds max_price |
| status | TEXT | active/dismissed/contacted/requested/confirmed/completed/cancelled |
| is_user_modified | BOOLEAN | User customized the trade |
| is_favorite_a | BOOLEAN | User A favorited |
| is_favorite_b | BOOLEAN | User B favorited |

#### `match_cards`
Specific cards in each match.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| match_id | UUID | Foreign key to matches |
| direction | TEXT | 'a_wants' or 'b_wants' |
| wishlist_id | UUID | Foreign key to wishlist |
| collection_id | UUID | Foreign key to collections |
| card_id | UUID | Foreign key to cards |
| card_name | TEXT | Cached card name |
| asking_price | DECIMAL | Price from collection |
| max_price | DECIMAL | Max price from wishlist |
| price_exceeds_max | BOOLEAN | Price warning flag |
| is_excluded | BOOLEAN | User excluded from trade |
| is_custom | BOOLEAN | Manually added card |

#### `match_comments`
Comments between users on a match.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| match_id | UUID | Foreign key to matches |
| user_id | UUID | Comment author |
| content | TEXT | Comment text |

---

## 4. API Endpoints

### Matching

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matches/compute` | Compute matches for current user |
| GET | `/api/matches` | List user's matches (with filters) |
| PATCH | `/api/matches` | Update match status or favorite |
| GET | `/api/matches/[id]` | Get match details |
| PATCH | `/api/matches/[id]` | Update match (exclude cards, request trade) |
| GET | `/api/matches/[id]/comments` | Get match comments |
| POST | `/api/matches/[id]/comments` | Add comment |

### Collections & Wishlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collection` | Get user's collection |
| POST | `/api/collection` | Add card to collection |
| DELETE | `/api/collection/[id]` | Remove card |
| GET | `/api/wishlist` | Get user's wishlist |
| POST | `/api/wishlist` | Add card to wishlist |
| DELETE | `/api/wishlist/[id]` | Remove card |
| POST | `/api/import/csv` | Bulk import from CSV |

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/search?q=` | Search cards (Scryfall) |
| GET | `/api/cards/printings?name=` | Get all printings of a card |

---

## 5. Trade Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        TRADE LIFECYCLE                        │
└──────────────────────────────────────────────────────────────┘

  ACTIVE                    User can:
    │                       - View match details
    │                       - Exclude/include cards
    │                       - Save changes
    │                       - Add custom cards
    │                       - Comment
    │                       - Dismiss match
    │
    ├──→ DISMISSED          Match hidden from active list
    │                       Can be restored to ACTIVE
    │
    ├──→ CONTACTED          User marked as "contacted outside app"
    │                       Informational status
    │
    └──→ REQUESTED          User A clicks "Solicitar trade"
           │                 User B sees pending request
           │
           ├──→ CANCELLED   Either user cancels
           │
           └──→ CONFIRMED   User B confirms trade
                  │          Cards go into "escrow" (excluded from
                  │          other matches)
                  │
                  └──→ COMPLETED   Trade marked as done
                                   Historical record preserved
```

---

## 6. Current Feature Status

### Completed Features

- [x] User registration (email + Google OAuth)
- [x] Password reset
- [x] Profile management (name, language, avatar)
- [x] Location setup with Google Maps autocomplete
- [x] Configurable search radius (1-100 km)
- [x] Trade mode preferences (trade/sell/buy/both)
- [x] Collection management (add, edit, delete cards)
- [x] Global discount setting for collection
- [x] Per-card pricing (percentage or fixed)
- [x] Wishlist management with preferences
- [x] Edition preference (any or specific)
- [x] Condition preference (min acceptable)
- [x] Foil preference (any/foil/non-foil)
- [x] Max price per card
- [x] Priority per card
- [x] Bulk import (CSV, Moxfield, ManaBox, Deckbox, CubeCobra)
- [x] Proximity-based matching algorithm
- [x] Match scoring and ranking
- [x] Match filtering (disponibles, activos, historial)
- [x] Match sorting (score, distance, cards, value, discount)
- [x] Favorites system for matches
- [x] Card exclusion in trades
- [x] Custom card addition to trades
- [x] Comment system between users
- [x] Full trade flow (request → confirm → complete)
- [x] PWA support (installable, offline-capable)
- [x] Dark theme
- [x] Mobile-first responsive design
- [x] Rate limiting (Upstash Redis)
- [x] Analytics (Vercel Analytics)
- [x] SWR caching with auto-refresh on focus

### Not Implemented (Post-MVP)

- [ ] Push notifications (VAPID configured, backend pending)
- [ ] Email verification enforcement
- [ ] Landing page for non-authenticated users
- [ ] Internationalization (currently Spanish only)
- [ ] Vacation mode
- [ ] Camera-based card scanning
- [ ] Reputation/rating system
- [ ] Price drop alerts

---

## 7. Pre-Launch Checklist

### Testing Requirements

| Category | Status | Notes |
|----------|--------|-------|
| **E2E Tests** | Partial | Auth, bulk import, trade flow specs exist |
| **Load Testing** | Ready | k6 stress test configured (up to 100 VUs) |
| **Unit Tests** | Missing | No unit tests for matching algorithm |
| **Integration Tests** | Missing | No API integration tests |
| **Manual QA** | In Progress | Core flows tested manually |

### Recommended Pre-Launch Tests

1. **Matching Algorithm Tests**
   - Test all match types (two_way, one_way_buy, one_way_sell)
   - Test trade_mode filtering
   - Test condition/foil/edition matching
   - Test score calculation edge cases
   - Test match preservation logic

2. **Load/Stress Tests**
   - Run k6 stress test: `k6 run tests/load/stress-test.js`
   - Target: 100 concurrent users, <500ms p95 response time
   - Test match computation under load (expensive operation)

3. **Edge Cases**
   - User with 0 cards in collection/wishlist
   - User with 1000+ cards
   - Two users at exactly same location
   - User at edge of radius
   - Match with 50+ cards

4. **Security Audit**
   - RLS policies review
   - API rate limiting verification
   - Input validation on all endpoints
   - CORS configuration

### Infrastructure Checklist

- [x] Vercel deployment configured
- [x] Supabase production instance
- [x] Environment variables set
- [x] Domain configured
- [ ] Supabase email verification enabled
- [ ] Error monitoring (Sentry/LogRocket)
- [ ] Backup strategy defined
- [ ] Uptime monitoring

---

## 8. Running Tests

```bash
# Build (type checking)
npm run build

# E2E tests (Playwright)
npm run test

# E2E tests with UI (visual mode)
npm run test:ui

# E2E tests headed (see browser)
npm run test:headed

# Load test (k6 - install separately)
k6 run tests/load/stress-test.js

# Load test against production
k6 run -e BASE_URL=https://natural-order.vercel.app tests/load/stress-test.js
```

---

## 9. Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in Supabase and Google Maps credentials

# Run migrations in Supabase SQL Editor
# Execute files in /supabase/migrations/ in order

# Start development server
npm run dev
```

---

## 10. Deployment

The project deploys automatically to Vercel on push to `master` branch.

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[maps-key]
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[vapid-public]
VAPID_PRIVATE_KEY=[vapid-private]
UPSTASH_REDIS_REST_URL=[redis-url]
UPSTASH_REDIS_REST_TOKEN=[redis-token]
```

---

## 11. License

Private - All rights reserved.
