-- Add address field to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS address TEXT;

-- Make the locations table simpler for single-location approach
-- Each user should have at most one location

-- Create a unique constraint to ensure one location per user
-- First, delete any duplicate locations (keep the most recent one)
DELETE FROM public.locations a
USING public.locations b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_user_id_unique;

ALTER TABLE public.locations
ADD CONSTRAINT locations_user_id_unique UNIQUE (user_id);

-- Update the is_active column to default to true (since there's only one location)
ALTER TABLE public.locations
ALTER COLUMN is_active SET DEFAULT true;
