-- Migration: Add has_been_configured column to preferences
-- This column tracks whether the user has explicitly saved their preferences
-- vs having the auto-created defaults from the trigger

ALTER TABLE public.preferences
ADD COLUMN IF NOT EXISTS has_been_configured BOOLEAN DEFAULT false;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN public.preferences.has_been_configured IS
'Tracks whether preferences have been explicitly saved by the user. False means auto-created by trigger.';
