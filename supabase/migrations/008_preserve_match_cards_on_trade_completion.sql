-- Migration: Preserve match_cards when trades are completed
-- Problem: When collection/wishlist items are deleted after trade completion,
-- the ON DELETE CASCADE removes the match_cards, losing trade history.
-- Solution: Change to ON DELETE SET NULL so completed trades retain their card history.

-- Step 1: Make the columns nullable
ALTER TABLE match_cards
  ALTER COLUMN wishlist_id DROP NOT NULL,
  ALTER COLUMN collection_id DROP NOT NULL;

-- Step 2: Drop the existing foreign key constraints
ALTER TABLE match_cards
  DROP CONSTRAINT IF EXISTS match_cards_wishlist_id_fkey,
  DROP CONSTRAINT IF EXISTS match_cards_collection_id_fkey;

-- Step 3: Recreate the constraints with ON DELETE SET NULL
ALTER TABLE match_cards
  ADD CONSTRAINT match_cards_wishlist_id_fkey
    FOREIGN KEY (wishlist_id) REFERENCES wishlist(id) ON DELETE SET NULL,
  ADD CONSTRAINT match_cards_collection_id_fkey
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON COLUMN match_cards.wishlist_id IS 'Reference to wishlist entry. NULL if the wishlist item was deleted (e.g., after trade completion)';
COMMENT ON COLUMN match_cards.collection_id IS 'Reference to collection entry. NULL if the collection item was deleted (e.g., after trade completion)';
