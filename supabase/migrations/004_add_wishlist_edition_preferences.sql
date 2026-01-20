-- Add edition preference columns to wishlist table
ALTER TABLE wishlist
ADD COLUMN edition_preference TEXT DEFAULT 'any' CHECK (edition_preference IN ('any', 'specific')),
ADD COLUMN specific_editions TEXT[] DEFAULT '{}';

-- Add index for querying by specific editions
CREATE INDEX wishlist_specific_editions_idx ON wishlist USING GIN(specific_editions);

-- Comment for documentation
COMMENT ON COLUMN wishlist.edition_preference IS 'Whether user wants any edition or specific ones';
COMMENT ON COLUMN wishlist.specific_editions IS 'Array of scryfall_ids when edition_preference is specific';
