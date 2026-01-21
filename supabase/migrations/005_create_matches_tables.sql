-- Matches table: stores computed matches between users
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The two users involved (references public.users, not auth.users)
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Match type
  match_type TEXT NOT NULL CHECK (match_type IN ('two_way', 'one_way_buy', 'one_way_sell')),
  -- two_way: both users have cards the other wants
  -- one_way_buy: user_b has cards user_a wants (from user_a's perspective)
  -- one_way_sell: user_a has cards user_b wants (from user_a's perspective)

  -- Distance between users (in km)
  distance_km DECIMAL(10,2),

  -- Summary stats
  cards_a_wants_count INTEGER NOT NULL DEFAULT 0,  -- cards user_a wants that user_b has
  cards_b_wants_count INTEGER NOT NULL DEFAULT 0,  -- cards user_b wants that user_a has
  value_a_wants DECIMAL(10,2) DEFAULT 0,           -- total value of cards user_a wants
  value_b_wants DECIMAL(10,2) DEFAULT 0,           -- total value of cards user_b wants

  -- Scoring for ranking
  match_score DECIMAL(10,4) NOT NULL DEFAULT 0,

  -- Price warnings
  has_price_warnings BOOLEAN DEFAULT false,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'contacted')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique match pair (user_a should always be < user_b to avoid duplicates)
  CONSTRAINT unique_match_pair UNIQUE (user_a_id, user_b_id),
  CONSTRAINT different_users CHECK (user_a_id != user_b_id)
);

-- Match cards: the specific cards involved in a match
CREATE TABLE match_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Which direction: who wants this card
  direction TEXT NOT NULL CHECK (direction IN ('a_wants', 'b_wants')),
  -- a_wants: user_a wants this card, user_b has it
  -- b_wants: user_b wants this card, user_a has it

  -- The wishlist entry (what user wants)
  wishlist_id UUID NOT NULL REFERENCES wishlist(id) ON DELETE CASCADE,

  -- The collection entry (what other user has)
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,

  -- Card reference for quick access
  card_id UUID NOT NULL REFERENCES cards(id),

  -- Cached info for display
  card_name TEXT NOT NULL,
  card_set_code TEXT NOT NULL,
  card_image_uri TEXT,

  -- Price info
  asking_price DECIMAL(10,2),        -- price from collection
  max_price DECIMAL(10,2),           -- max price from wishlist
  price_exceeds_max BOOLEAN DEFAULT false,

  -- Condition match info
  collection_condition TEXT NOT NULL,
  wishlist_min_condition TEXT NOT NULL,

  -- Foil info
  is_foil BOOLEAN DEFAULT false,

  quantity_available INTEGER NOT NULL DEFAULT 1,
  quantity_wanted INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX matches_user_a_idx ON matches(user_a_id);
CREATE INDEX matches_user_b_idx ON matches(user_b_id);
CREATE INDEX matches_score_idx ON matches(match_score DESC);
CREATE INDEX matches_status_idx ON matches(status);
CREATE INDEX match_cards_match_idx ON match_cards(match_id);
CREATE INDEX match_cards_direction_idx ON match_cards(direction);

-- RLS Policies
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_cards ENABLE ROW LEVEL SECURITY;

-- Users can see matches they're part of
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Users can update status of their matches
CREATE POLICY "Users can update their match status"
  ON matches FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- System can insert matches (via service role)
CREATE POLICY "System can insert matches"
  ON matches FOR INSERT
  WITH CHECK (true);

-- System can delete matches
CREATE POLICY "System can delete matches"
  ON matches FOR DELETE
  USING (true);

-- Users can see match cards for their matches
CREATE POLICY "Users can view match cards for their matches"
  ON match_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_cards.match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );

-- System can manage match cards
CREATE POLICY "System can insert match cards"
  ON match_cards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can delete match cards"
  ON match_cards FOR DELETE
  USING (true);

-- Function to get distance between two users (using their active locations)
CREATE OR REPLACE FUNCTION get_user_distance(user1_id UUID, user2_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  loc1 RECORD;
  loc2 RECORD;
  distance DECIMAL;
BEGIN
  -- Get active location for user 1
  SELECT latitude, longitude INTO loc1
  FROM locations
  WHERE user_id = user1_id AND is_active = true
  LIMIT 1;

  -- Get active location for user 2
  SELECT latitude, longitude INTO loc2
  FROM locations
  WHERE user_id = user2_id AND is_active = true
  LIMIT 1;

  -- If either user has no location, return null
  IF loc1 IS NULL OR loc2 IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate distance using Haversine formula (returns km)
  distance := 6371 * acos(
    cos(radians(loc1.latitude)) * cos(radians(loc2.latitude)) *
    cos(radians(loc2.longitude) - radians(loc1.longitude)) +
    sin(radians(loc1.latitude)) * sin(radians(loc2.latitude))
  );

  RETURN ROUND(distance::numeric, 2);
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE matches IS 'Computed matches between users based on collection/wishlist overlap';
COMMENT ON TABLE match_cards IS 'Specific cards involved in each match';
COMMENT ON FUNCTION get_user_distance IS 'Calculate distance in km between two users active locations';
