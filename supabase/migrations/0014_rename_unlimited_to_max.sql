-- 0014: Rename unlimited plan to max

-- Drop the foreign key constraint first
ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_plan_id_fkey;

-- Now we can safely rename the plans
UPDATE subscription_plans 
SET id = 'max' 
WHERE id = 'unlimited';

UPDATE user_subscriptions
SET plan_id = 'max'
WHERE plan_id = 'unlimited';

-- Re-establish the correct foreign key constraint
ALTER TABLE user_subscriptions 
  ADD CONSTRAINT user_subscriptions_plan_id_fkey 
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);