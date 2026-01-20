-- Cards table (synced from Scryfall)
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scryfall_id TEXT UNIQUE NOT NULL,
  oracle_id TEXT NOT NULL,
  name TEXT NOT NULL,
  set_code TEXT NOT NULL,
  set_name TEXT NOT NULL,
  collector_number TEXT,
  image_uri TEXT,
  image_uri_small TEXT,
  prices_usd DECIMAL(10,2),
  prices_usd_foil DECIMAL(10,2),
  rarity TEXT,
  type_line TEXT,
  mana_cost TEXT,
  colors TEXT[],
  color_identity TEXT[],
  cmc DECIMAL(3,1),
  legalities JSONB,
  released_at DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for card search
CREATE INDEX cards_name_idx ON public.cards USING GIN(to_tsvector('english', name));
CREATE INDEX cards_oracle_idx ON public.cards(oracle_id);
CREATE INDEX cards_set_idx ON public.cards(set_code);
CREATE INDEX cards_name_text_idx ON public.cards(LOWER(name));

-- Collections table
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
  condition TEXT NOT NULL CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG')),
  foil BOOLEAN DEFAULT false,
  price_mode TEXT DEFAULT 'percentage' CHECK (price_mode IN ('percentage', 'fixed')),
  price_percentage INTEGER DEFAULT 100 CHECK (price_percentage >= 1 AND price_percentage <= 200),
  price_fixed DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, condition, foil)
);

CREATE INDEX collections_user_idx ON public.collections(user_id);
CREATE INDEX collections_card_idx ON public.collections(card_id);

-- Wishlist table
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  oracle_id TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
  max_price DECIMAL(10,2),
  min_condition TEXT DEFAULT 'LP' CHECK (min_condition IN ('NM', 'LP', 'MP', 'HP', 'DMG')),
  foil_preference TEXT DEFAULT 'any' CHECK (foil_preference IN ('any', 'foil_only', 'non_foil')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX wishlist_user_idx ON public.wishlist(user_id);
CREATE INDEX wishlist_oracle_idx ON public.wishlist(oracle_id);
CREATE INDEX wishlist_card_idx ON public.wishlist(card_id);

-- Enable RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Cards are readable by everyone (public data)
CREATE POLICY "Cards are viewable by everyone"
  ON public.cards FOR SELECT
  USING (true);

-- Collections policies
CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- Wishlist policies
CREATE POLICY "Users can view their own wishlist"
  ON public.wishlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist"
  ON public.wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist"
  ON public.wishlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist"
  ON public.wishlist FOR DELETE
  USING (auth.uid() = user_id);
