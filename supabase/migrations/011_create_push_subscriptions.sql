-- Push subscriptions table: stores Web Push API subscriptions for each user
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who owns this subscription
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Web Push subscription details
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,  -- Public key for encryption
  auth_key TEXT NOT NULL,    -- Auth secret for encryption

  -- Device/browser info for management
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique endpoint per user (same browser/device)
  CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

-- Indexes for performance
CREATE INDEX push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can create their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE push_subscriptions IS 'Web Push API subscriptions for browser push notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL from browser';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'User public key for ECDH encryption (base64)';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret for encryption (base64)';
