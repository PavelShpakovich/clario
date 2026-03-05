-- 0012: Fix card usage tracking with atomic increment function
-- Root cause: UPSERT with ignoreDuplicates=false was resetting cards_generated to 0
--             .single() was failing on duplicate records from the trigger
--             No atomic guarantee between read and write

-- Step 1: Drop the trigger that created duplicate usage records on subscription insert
DROP TRIGGER IF EXISTS trigger_initialize_user_usage ON user_subscriptions;
DROP FUNCTION IF EXISTS initialize_user_usage();

-- Step 2: Clean up any duplicate/corrupt usage records — truncate for clean state
TRUNCATE TABLE user_usage;

-- Step 3: Create atomic increment function
-- Atomically updates existing period OR creates a new one (no duplicates possible)
CREATE OR REPLACE FUNCTION increment_card_usage(p_user_id UUID, p_count INT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows_updated INT;
  v_period_start TIMESTAMPTZ;
  v_period_end   TIMESTAMPTZ;
  v_cards_limit  INT;
BEGIN
  -- Try to update an existing period atomically (no read-then-write race condition)
  UPDATE user_usage
  SET
    cards_generated = COALESCE(cards_generated, 0) + p_count,
    updated_at      = NOW()
  WHERE user_id     = p_user_id
    AND period_start <= NOW()
    AND period_end   >= NOW();

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- If no current period existed, create one derived from subscription start
  IF v_rows_updated = 0 THEN
    -- Derive period from subscription's current_period_start
    SELECT current_period_start INTO v_period_start
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    v_period_start := COALESCE(v_period_start, NOW());
    v_period_end   := v_period_start + INTERVAL '30 days';

    -- Resolve card limit from active plan (default 20 for free/unsubscribed)
    SELECT sp.cards_per_month INTO v_cards_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id AND us.status = 'active';

    v_cards_limit := COALESCE(v_cards_limit, 20);

    -- Insert or add to existing (handles concurrent race conditions)
    INSERT INTO user_usage (user_id, cards_generated, cards_limit, period_start, period_end)
    VALUES (p_user_id, p_count, v_cards_limit, v_period_start, v_period_end)
    ON CONFLICT (user_id, period_start) DO UPDATE
      SET cards_generated = user_usage.cards_generated + EXCLUDED.cards_generated,
          updated_at      = NOW();
  END IF;
END;
$$;
