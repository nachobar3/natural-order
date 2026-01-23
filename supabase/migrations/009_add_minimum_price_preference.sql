-- Add minimum_price field to preferences table
ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS minimum_price DECIMAL(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN preferences.minimum_price IS 'Minimum price per card in USD. Cards will not be listed below this value when using percentage pricing.';
