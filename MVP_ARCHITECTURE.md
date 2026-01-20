# Natural Order - MVP Architecture & Roadmap

**Version:** 1.0
**Last Updated:** January 2026
**Status:** Planning

---

## 1. Product Overview

### 1.1 Vision
A proximity-based marketplace for MTG card trading that matches users based on their collections, wishlists, and location.

### 1.2 Core Value Proposition
- **For traders:** Find people nearby who have the cards you want
- **For sellers:** Reach local buyers without shipping hassles
- **Differentiator:** Automatic matching + proximity awareness + reference pricing

### 1.3 MVP Scope
| In Scope | Out of Scope (Post-MVP) |
|----------|------------------------|
| User registration & profiles | Camera card scanning |
| Collection & wishlist management | Multiple card games (Pokémon, etc.) |
| Proximity-based matching | Store/LGS integration |
| In-app messaging | Advanced analytics dashboard |
| Price reference (Card Kingdom) | Escrow/payment processing |
| Push notifications | Reputation/rating system |

---

## 2. Technical Stack

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   Next.js 14 + Tailwind                      │
│                      PWA-enabled                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │    Supabase     │    │      Python FastAPI             │ │
│  │  - Auth         │    │  - Matching algorithm           │ │
│  │  - Database     │    │  - Scryfall sync                │ │
│  │  - Realtime     │    │  - Price calculations           │ │
│  │  - Storage      │    │  - Bulk import processing       │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  - Scryfall API (card data)                                  │
│  - Card Kingdom (price reference)                            │
│  - Google Maps API (future: travel time)                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14 + Tailwind CSS | SSR, PWA support, great DX |
| **Auth** | Supabase Auth | Email + Google OAuth built-in |
| **Database** | Supabase (PostgreSQL) | Relational data, PostGIS for geo |
| **Realtime** | Supabase Realtime | Chat, notifications |
| **Backend API** | Python FastAPI | Complex matching logic, Scryfall sync |
| **Hosting** | Vercel (frontend) + Railway/Fly.io (Python) | Easy deployment, good free tiers |
| **Card Data** | Scryfall API | Free, comprehensive, well-maintained |

### 2.3 Why PostgreSQL over MongoDB

For Natural Order specifically:
1. **Strong relationships:** Users → Collections → Cards → Editions
2. **PostGIS extension:** Native geolocation queries for proximity matching
3. **Supabase ecosystem:** Auth, Realtime, Row-Level Security included
4. **ACID compliance:** Important for trade transactions

---

## 3. Data Model

### 3.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  locations   │       │ preferences  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──────<│ user_id (FK) │       │ user_id (FK) │
│ email        │       │ name         │       │ trade_mode   │
│ display_name │       │ coordinates  │       │ min_match    │
│ avatar_url   │       │ radius_km    │       │ availability │
│ created_at   │       │ is_active    │       │ notify_prefs │
└──────────────┘       └──────────────┘       └──────────────┘
        │
        │
        ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ collections  │       │   wishlist   │       │    cards     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ user_id (FK) │       │ user_id (FK) │       │ scryfall_id  │
│ card_id (FK) │       │ card_id (FK) │       │ name         │
│ edition_id   │       │ edition_id   │       │ set_code     │
│ condition    │       │ max_price    │       │ collector_no │
│ quantity     │       │ min_condition│       │ image_uri    │
│ price_mode   │       │ quantity     │       │ prices_usd   │
│ price_value  │       │ priority     │       │ updated_at   │
│ notes        │       └──────────────┘       └──────────────┘
└──────────────┘
        │
        ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   matches    │       │   messages   │       │conversations │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ user_a_id    │       │ convo_id(FK) │       │ match_id(FK) │
│ user_b_id    │       │ sender_id    │       │ user_a_id    │
│ match_type   │       │ content      │       │ user_b_id    │
│ cards_a_wants│       │ created_at   │       │ status       │
│ cards_b_wants│       │ read_at      │       │ created_at   │
│ distance_km  │       └──────────────┘       └──────────────┘
│ total_value  │
│ created_at   │
└──────────────┘
```

### 3.2 Core Tables Definition

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'es', -- es, en, pt
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### locations
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Casa", "Trabajo", etc.
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS
  radius_km INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX locations_geo_idx ON locations USING GIST(coordinates);
```

#### preferences
```sql
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  trade_mode TEXT DEFAULT 'both', -- 'trade_only', 'sell_only', 'both'
  min_match_threshold INTEGER DEFAULT 1, -- minimum cards for notification
  availability JSONB, -- {"monday": ["18:00-21:00"], ...}
  notify_new_matches BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### cards (synced from Scryfall)
```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scryfall_id TEXT UNIQUE NOT NULL,
  oracle_id TEXT NOT NULL, -- groups all editions of same card
  name TEXT NOT NULL,
  set_code TEXT NOT NULL,
  set_name TEXT NOT NULL,
  collector_number TEXT,
  image_uri TEXT,
  prices_usd DECIMAL(10,2), -- Card Kingdom reference
  rarity TEXT,
  type_line TEXT,
  mana_cost TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX cards_name_idx ON cards USING GIN(to_tsvector('english', name));
CREATE INDEX cards_oracle_idx ON cards(oracle_id);
```

#### collections
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id),
  quantity INTEGER DEFAULT 1,
  condition TEXT NOT NULL, -- 'NM', 'LP', 'MP', 'HP', 'DMG'
  price_mode TEXT DEFAULT 'percentage', -- 'percentage', 'fixed'
  price_percentage INTEGER DEFAULT 100, -- % of Card Kingdom price
  price_fixed DECIMAL(10,2), -- if price_mode = 'fixed'
  foil BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, condition, foil)
);

CREATE INDEX collections_user_idx ON collections(user_id);
```

#### wishlist
```sql
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id),
  oracle_id TEXT, -- if any edition is acceptable
  quantity INTEGER DEFAULT 1,
  max_price DECIMAL(10,2), -- maximum willing to pay
  min_condition TEXT DEFAULT 'LP', -- minimum acceptable
  foil_preference TEXT DEFAULT 'any', -- 'any', 'foil_only', 'non_foil'
  priority INTEGER DEFAULT 5, -- 1-10, higher = more wanted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX wishlist_user_idx ON wishlist(user_id);
CREATE INDEX wishlist_oracle_idx ON wishlist(oracle_id);
```

---

## 4. Feature Specifications

### 4.1 Authentication

**Methods supported:**
- Email + Password
- Google OAuth

**Flow:**
1. User lands on homepage → clicks "Join" / "Sign In"
2. Choose method (email or Google)
3. If new user → redirect to onboarding (set display name, location)
4. If returning → redirect to dashboard

**Implementation:** Supabase Auth with Next.js middleware for protected routes.

### 4.2 User Profile & Preferences

**Profile fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| display_name | text | Yes | Public name |
| avatar | image | No | Upload |
| preferred_language | select | Yes | es, en, pt |

**Preferences:**
| Preference | Options | Default |
|------------|---------|---------|
| Trade mode | Trade only / Sell only / Both | Both |
| Min match threshold | 1-10 cards | 1 |
| Availability | Day/time slots | All times |
| Notifications | New matches / Messages | Both on |

### 4.3 Location Management

**Features:**
- Auto-detect via browser Geolocation API (with permission)
- Manual input via address search (Geocoding API)
- Save multiple locations ("Home", "Work", "LGS")
- Set active location (one at a time)
- Set search radius (1km, 5km, 10km, 25km, 50km)

**Privacy:**
- Exact coordinates never shown to other users
- Only distance/direction displayed ("~2km north")

### 4.4 Card Search & Management

#### Search
- Powered by local Scryfall data (synced daily)
- Search by: name, set, collector number
- Autocomplete with card images
- Filter by: set, rarity, color, type

#### Adding to Collection
**Single card:**
1. Search for card
2. Select specific edition (set + collector number)
3. Set condition (NM, LP, MP, HP, DMG)
4. Set quantity
5. Set price: % of Card Kingdom OR fixed USD
6. Optional: mark as foil, add notes

**Bulk import:**
- Supported formats: Moxfield, ManaBox, Deckbox, plain CSV
- Format auto-detection
- Preview before import
- Conflict resolution (duplicate handling)

**CSV format example:**
```csv
Count,Name,Edition,Condition,Foil,Price Mode,Price Value
4,Lightning Bolt,2XM,NM,false,percentage,80
1,Ragavan Nimble Pilferer,MH2,LP,false,fixed,45.00
```

#### Adding to Wishlist
1. Search for card
2. Choose: specific edition OR any edition (oracle_id)
3. Set max price willing to pay
4. Set minimum acceptable condition
5. Set priority (1-10)
6. Set foil preference

### 4.5 Pricing System

**Reference market:** Card Kingdom (primary)
- Fallback: Scryfall price data (TCGPlayer market)

**Price display:**
- All prices in USD
- Show discount from reference: "80% of CK ($36.00 → $28.80)"

**User pricing options:**
1. **Percentage mode:** Set % of Card Kingdom price (e.g., 80%)
2. **Fixed mode:** Set exact USD price

**Price updates:**
- Card Kingdom prices synced daily via scraping/API
- User notified if their prices become stale (>7 days)

### 4.6 Matching Algorithm

#### Match Types
| Type | Description | Display |
|------|-------------|---------|
| **Two-way trade** | Both users have cards the other wants | ⭐ Best match |
| **One-way buy** | They have what I want (I may sell) | Standard match |
| **One-way sell** | I have what they want | Opportunity |

#### Match Calculation
```python
def calculate_match(user_a, user_b):
    # Cards user_a wants that user_b has
    a_wants = intersect(user_a.wishlist, user_b.collection)

    # Cards user_b wants that user_a has
    b_wants = intersect(user_b.wishlist, user_a.collection)

    # Filter by conditions, prices, preferences
    a_wants_filtered = filter_by_preferences(a_wants, user_a.wishlist_prefs)
    b_wants_filtered = filter_by_preferences(b_wants, user_b.wishlist_prefs)

    # Calculate distance
    distance = calculate_distance(user_a.active_location, user_b.active_location)

    # Calculate total value
    total_value_a = sum(card.price for card in a_wants_filtered)
    total_value_b = sum(card.price for card in b_wants_filtered)

    return Match(
        cards_a_wants=a_wants_filtered,
        cards_b_wants=b_wants_filtered,
        match_type='two_way' if both else 'one_way',
        distance_km=distance,
        total_value=total_value_a
    )
```

#### Match Display (MVP)
```
┌─────────────────────────────────────────────┐
│ 🔄 Juan M.                         ~2.5 km  │
│                                             │
│ They have 4 cards you want         ~$85 USD │
│ You have 2 cards they want         ~$32 USD │
│                                             │
│ [View Details]              [Send Message]  │
└─────────────────────────────────────────────┘
```

### 4.7 Messaging

**Features:**
- In-app real-time chat (Supabase Realtime)
- WhatsApp fallback button (opens wa.me link)
- Message history per match
- Read receipts
- Push notifications for new messages

**Chat UI:**
- Conversation list (sorted by recent)
- Individual chat view with card context
- Quick actions: "Propose meetup", "Share location"

### 4.8 Notifications

**Push notification triggers:**
| Event | Condition | Message |
|-------|-----------|---------|
| New match | Cards >= min_threshold | "New match! Juan has 4 cards you want" |
| New message | Always | "Juan: Are you free Saturday?" |
| Price drop | Wishlist card price drops | "Ragavan dropped to $42 on Card Kingdom" |

**Implementation:** Web Push API + Supabase Edge Functions

---

## 5. API Design

### 5.1 Supabase (Direct Client Access)

Used for: Auth, realtime subscriptions, simple CRUD

```typescript
// Auth
supabase.auth.signInWithOAuth({ provider: 'google' })
supabase.auth.signInWithPassword({ email, password })

// Collections
supabase.from('collections').select('*, cards(*)').eq('user_id', userId)
supabase.from('collections').insert({ user_id, card_id, condition, ... })

// Realtime chat
supabase.channel('messages:convo_123').on('INSERT', handleNewMessage)
```

### 5.2 FastAPI Backend

Used for: Complex logic, external API calls, bulk operations

```
POST   /api/v1/cards/search          # Search cards (Scryfall data)
POST   /api/v1/cards/sync            # Admin: sync Scryfall data
POST   /api/v1/import/collection     # Bulk import collection
POST   /api/v1/import/wishlist       # Bulk import wishlist
GET    /api/v1/matches               # Get matches for current user
POST   /api/v1/matches/refresh       # Force recalculate matches
GET    /api/v1/prices/card/:id       # Get current Card Kingdom price
POST   /api/v1/prices/sync           # Admin: sync prices
```

---

## 6. Development Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Next.js, Supabase, FastAPI)
- [ ] Database schema creation
- [ ] Authentication (Email + Google)
- [ ] Basic user profile & preferences
- [ ] Location management (manual + GPS)

### Phase 2: Card Data (Week 3-4)
- [ ] Scryfall data sync script
- [ ] Card search with autocomplete
- [ ] Collection management (single add)
- [ ] Wishlist management (single add)
- [ ] Price reference integration (Card Kingdom)

### Phase 3: Bulk Import (Week 5)
- [ ] CSV parser for Moxfield/ManaBox format
- [ ] Import preview & validation
- [ ] Bulk insert with progress
- [ ] Conflict resolution UI

### Phase 4: Matching (Week 6-7)
- [ ] Matching algorithm implementation
- [ ] Match calculation job (background)
- [ ] Match list UI
- [ ] Match detail view
- [ ] Distance calculation (radius-based)

### Phase 5: Communication (Week 8)
- [ ] In-app messaging
- [ ] WhatsApp fallback
- [ ] Push notifications setup
- [ ] Notification preferences

### Phase 6: Polish & Launch (Week 9-10)
- [ ] i18n (ES, EN, PT)
- [ ] PWA configuration
- [ ] Performance optimization
- [ ] Error handling & edge cases
- [ ] Beta testing with power users
- [ ] Launch to waitlist

---

## 7. Internationalization (i18n)

### Supported Languages
| Code | Language | Market |
|------|----------|--------|
| es | Spanish | Argentina, Chile, Mexico, etc. |
| en | English | US, Global |
| pt | Portuguese | Brazil |

### Implementation
- Use `next-intl` for Next.js
- Store user preference in `users.preferred_language`
- Fallback chain: User pref → Browser → Spanish

### Translation scope (MVP)
- All UI text
- Error messages
- Email templates
- Push notification text

---

## 8. Security Considerations

### Data Protection
- Row-Level Security (RLS) on all user data
- Users can only access their own collections/wishlists
- Location coordinates encrypted at rest

### API Security
- Supabase: JWT validation via middleware
- FastAPI: API key + JWT validation
- Rate limiting on search/import endpoints

### Privacy
- Exact coordinates never exposed
- Email hidden from other users
- Option to hide from search (vacation mode)

---

## 9. Scalability Notes

### Database
- PostgreSQL handles millions of rows easily
- Indexes on: user_id, card_id, oracle_id, coordinates
- Consider partitioning collections table by user_id if >1M users

### Matching Algorithm
- Run as background job, not real-time
- Cache matches, invalidate on collection/wishlist changes
- Consider pre-computing common card overlaps

### Price Sync
- Daily job, off-peak hours
- Only update cards in active collections/wishlists
- ~30K unique cards in typical use = manageable

---

## 10. Success Metrics

### MVP Launch Goals
| Metric | Target |
|--------|--------|
| Registered users | 500 |
| Active users (weekly) | 200 |
| Collections uploaded | 300 |
| Matches generated | 1000+ |
| Messages sent | 500 |
| Completed trades (self-reported) | 50 |

### Key Health Indicators
- Match-to-message conversion rate
- Collection size (avg cards per user)
- Return rate (users active after 7 days)
- Geographic density (users per city)

---

*Document created: January 2026*
*Next review: After Phase 1 completion*
