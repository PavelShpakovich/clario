-- 0009: Update subscription tiers and add admin role
-- Adds is_admin column to profiles, updates plans to: Free 20/$0, Basic 200/$4.99, Pro 1000/$12.99, Unlimited 5000/$24.99

-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Delete old plans and re-insert with new pricing
DELETE FROM subscription_plans;

INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, cards_per_month, features)
VALUES
  (
    'free',
    'Free',
    'Get started with microlearning',
    0,
    0,
    20,
    '{"features": ["20 cards per month"]}'
  ),
  (
    'basic',
    'Basic',
    'For casual learners',
    499,
    4790,
    200,
    '{"features": ["200 cards per month"]}'
  ),
  (
    'pro',
    'Pro',
    'Powerful learning',
    1299,
    12490,
    1000,
    '{"features": ["1,000 cards per month"]}'
  ),
  (
    'unlimited',
    'Unlimited',
    'For power learners',
    2499,
    24490,
    5000,
    '{"features": ["5,000+ cards per month"]}'
  );

-- Create index on is_admin for fast queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
