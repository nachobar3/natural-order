-- Migration: Allow custom cards in matches (added manually, not by wishlist)

-- Make wishlist_id optional (NULL for custom cards)
ALTER TABLE match_cards
  ALTER COLUMN wishlist_id DROP NOT NULL;

-- Add columns for custom cards
ALTER TABLE match_cards
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users(id);

-- Create index for custom cards lookup
CREATE INDEX IF NOT EXISTS match_cards_custom_idx
  ON match_cards(match_id, is_custom) WHERE is_custom = true;

-- Add comment explaining the columns
COMMENT ON COLUMN match_cards.is_custom IS 'True if card was manually added from counterpart collection (not matched via wishlist)';
COMMENT ON COLUMN match_cards.added_by_user_id IS 'User who added this custom card to the trade';
