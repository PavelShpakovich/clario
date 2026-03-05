-- 0010: Fix user_usage duplicates and normalize period_start
-- Consolidates duplicate records and normalizes dates to month boundaries

-- Step 1: Temporarily disable unique constraint to allow consolidation
ALTER TABLE user_usage DROP CONSTRAINT user_usage_user_id_period_start_key;

-- Step 2: For each user+month, keep the record with highest cards_generated, delete others
DELETE FROM user_usage u1
WHERE EXISTS (
  SELECT 1 FROM user_usage u2
  WHERE u1.user_id = u2.user_id
  AND DATE_TRUNC('month', u1.period_start) = DATE_TRUNC('month', u2.period_start)
  AND (
    u1.cards_generated < u2.cards_generated
    OR (u1.cards_generated = u2.cards_generated AND u1.created_at > u2.created_at)
  )
);

-- Step 3: Normalize all period_start to first of month, period_end to first of next month
UPDATE user_usage
SET 
  period_start = DATE_TRUNC('month', period_start),
  period_end = DATE_TRUNC('month', period_start) + INTERVAL '1 month';

-- Step 4: Re-add unique constraint
ALTER TABLE user_usage 
ADD CONSTRAINT user_usage_user_id_period_start_key UNIQUE (user_id, period_start);
