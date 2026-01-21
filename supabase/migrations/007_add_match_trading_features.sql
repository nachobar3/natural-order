-- Migration: Add match trading features
-- Features: trade requests, confirmations, escrow, comments, notifications

-- =====================================================
-- 1. ALTER matches TABLE - Add new columns and states
-- =====================================================

-- First, drop the existing status constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- Add new columns to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS is_user_modified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_a_completed BOOLEAN,
  ADD COLUMN IF NOT EXISTS user_b_completed BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_conflict BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escrow_expires_at TIMESTAMPTZ;

-- Add new status constraint with expanded states
ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('active', 'dismissed', 'contacted', 'requested', 'confirmed', 'completed', 'cancelled'));

-- Index for escrow expiration (for cron job queries)
CREATE INDEX IF NOT EXISTS matches_escrow_expires_idx ON matches(escrow_expires_at)
  WHERE escrow_expires_at IS NOT NULL AND status = 'confirmed';

-- Index for finding user-modified matches
CREATE INDEX IF NOT EXISTS matches_user_modified_idx ON matches(is_user_modified)
  WHERE is_user_modified = true;

-- =====================================================
-- 2. ALTER match_cards TABLE - Add exclusion support
-- =====================================================

ALTER TABLE match_cards
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT false;

-- Index for excluded cards
CREATE INDEX IF NOT EXISTS match_cards_excluded_idx ON match_cards(match_id, is_excluded)
  WHERE is_excluded = true;

-- Users can update match_cards for their matches (to exclude/include cards)
CREATE POLICY "Users can update match cards for their matches"
  ON match_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_cards.match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_cards.match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );

-- =====================================================
-- 3. CREATE match_comments TABLE
-- =====================================================

CREATE TABLE match_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX match_comments_match_idx ON match_comments(match_id);
CREATE INDEX match_comments_user_created_idx ON match_comments(match_id, user_id, created_at);

-- RLS
ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments for matches they're part of
CREATE POLICY "Users can view comments for their matches"
  ON match_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_comments.match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );

-- Users can insert comments for their matches (limit enforced at API level)
CREATE POLICY "Users can insert comments for their matches"
  ON match_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_comments.match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON match_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. CREATE notifications TABLE
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'trade_requested',
    'trade_confirmed',
    'trade_completed',
    'trade_cancelled',
    'match_modified',
    'new_comment',
    'request_invalidated',
    'escrow_expiring'
  )),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX notifications_created_idx ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to count user comments in a match for current month
CREATE OR REPLACE FUNCTION get_user_comment_count_this_month(p_match_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM match_comments
    WHERE match_id = p_match_id
    AND user_id = p_user_id
    AND created_at >= date_trunc('month', NOW())
    AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate active (non-excluded) card values for a match
CREATE OR REPLACE FUNCTION calculate_match_values(p_match_id UUID)
RETURNS TABLE (
  value_a_wants DECIMAL,
  value_b_wants DECIMAL,
  cards_a_wants_count INTEGER,
  cards_b_wants_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'a_wants' AND NOT is_excluded THEN asking_price ELSE 0 END), 0)::DECIMAL AS value_a_wants,
    COALESCE(SUM(CASE WHEN direction = 'b_wants' AND NOT is_excluded THEN asking_price ELSE 0 END), 0)::DECIMAL AS value_b_wants,
    COALESCE(SUM(CASE WHEN direction = 'a_wants' AND NOT is_excluded THEN 1 ELSE 0 END), 0)::INTEGER AS cards_a_wants_count,
    COALESCE(SUM(CASE WHEN direction = 'b_wants' AND NOT is_excluded THEN 1 ELSE 0 END), 0)::INTEGER AS cards_b_wants_count
  FROM match_cards
  WHERE match_id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON COLUMN matches.is_user_modified IS 'True if any user has manually modified this match (excludes algorithm recalculation)';
COMMENT ON COLUMN matches.requested_by IS 'User who requested the trade';
COMMENT ON COLUMN matches.confirmed_at IS 'When both parties confirmed - starts 15-day escrow timer';
COMMENT ON COLUMN matches.user_a_completed IS 'User A marked trade as completed (null = pending)';
COMMENT ON COLUMN matches.user_b_completed IS 'User B marked trade as completed (null = pending)';
COMMENT ON COLUMN matches.has_conflict IS 'True if one user marked completed and other marked not completed';
COMMENT ON COLUMN matches.escrow_expires_at IS 'When the 15-day escrow period expires';

COMMENT ON COLUMN match_cards.is_excluded IS 'True if user excluded this card from the trade';

COMMENT ON TABLE match_comments IS 'Chat messages between users for a specific match';
COMMENT ON TABLE notifications IS 'User notifications for trade events';

COMMENT ON FUNCTION get_user_comment_count_this_month IS 'Returns count of comments a user has made in a match for the current month (max 10 allowed)';
COMMENT ON FUNCTION calculate_match_values IS 'Calculates total values excluding excluded cards for a match';
