-- Migration: Add is_favorite column to matches
-- Allows users to mark matches as favorites for easy filtering

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS is_favorite_a BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite_b BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.matches.is_favorite_a IS 'Whether user_a has marked this match as favorite';
COMMENT ON COLUMN public.matches.is_favorite_b IS 'Whether user_b has marked this match as favorite';

-- Add index for filtering favorites
CREATE INDEX IF NOT EXISTS idx_matches_favorites ON public.matches (is_favorite_a, is_favorite_b);
