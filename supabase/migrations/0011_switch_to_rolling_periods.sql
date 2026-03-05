-- 0011: Switch to rolling 30-day periods based on subscription date
-- Aligns usage periods with user subscription start, not calendar months

-- Step 1: Delete all existing usage records for clean slate
-- Users will get new periods created on next generation
TRUNCATE TABLE user_usage;

-- Step 2: Update all subscriptions to set current_period_start to their creation date
-- This ensures periods start from when user subscribed, not calendar month
UPDATE user_subscriptions
SET 
  current_period_start = created_at,
  current_period_end = created_at + INTERVAL '30 days'
WHERE current_period_start IS NULL OR current_period_start < created_at;

-- Step 3: Create index on period range queries for performance
CREATE INDEX IF NOT EXISTS idx_user_usage_period_range 
ON user_usage(user_id, period_start, period_end);
