-- Migration: Add 'buy' option to trade_mode enum
-- This allows users to filter matches to only show buying opportunities

ALTER TYPE trade_mode ADD VALUE IF NOT EXISTS 'buy';

-- Add a comment explaining the enum values
COMMENT ON TYPE trade_mode IS
'User trade mode preference:
- trade: Only show two-way matches (mutual exchanges)
- sell: Show matches where user can sell cards
- buy: Show matches where user can buy cards
- both: Show all match types';
