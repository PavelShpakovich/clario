-- Add subscription plans table
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- In cents
  price_annual INTEGER NOT NULL,
  cards_per_month INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
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

-- Add user subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, expired
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add user usage table for tracking monthly card generation
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cards_generated INTEGER DEFAULT 0,
  cards_limit INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Add billing history table
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  period_type TEXT NOT NULL, -- 'monthly' or 'annual'
  stripe_invoice_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX idx_user_usage_period ON user_usage(period_start, period_end);
CREATE INDEX idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX idx_billing_history_stripe_invoice ON billing_history(stripe_invoice_id);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can see their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can see their own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can see their own billing" ON billing_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public can see plans" ON subscription_plans
  FOR SELECT USING (TRUE);

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  INSERT INTO user_usage (user_id, cards_generated, cards_limit, period_start, period_end)
  SELECT 
    us.user_id,
    0,
    sp.cards_per_month,
    NOW(),
    NOW() + INTERVAL '1 month'
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE 
    NOT EXISTS (
      SELECT 1 FROM user_usage uu 
      WHERE uu.user_id = us.user_id 
      AND uu.period_start >= DATE_TRUNC('month', NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize usage on subscription creation
CREATE OR REPLACE FUNCTION initialize_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_usage (user_id, cards_generated, cards_limit, period_start, period_end)
  SELECT 
    NEW.user_id,
    0,
    sp.cards_per_month,
    NOW(),
    NOW() + INTERVAL '1 month'
  FROM subscription_plans sp
  WHERE sp.id = NEW.plan_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_user_usage
AFTER INSERT ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION initialize_user_usage();

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(user_id UUID)
RETURNS TABLE (plan_id TEXT, cards_per_month INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT sp.id, sp.cards_per_month
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = $1 AND us.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current usage
CREATE OR REPLACE FUNCTION get_user_usage(user_id UUID)
RETURNS TABLE (cards_generated INTEGER, cards_limit INTEGER, cards_remaining INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uu.cards_generated,
    uu.cards_limit,
    (uu.cards_limit - uu.cards_generated) as cards_remaining
  FROM user_usage uu
  WHERE uu.user_id = $1 
    AND uu.period_start <= NOW() 
    AND uu.period_end > NOW()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
