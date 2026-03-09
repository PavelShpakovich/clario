-- Drop unused columns from subscription_plans.
-- description: built dynamically in getPlanDetails from cards_per_month
-- max_community_themes: never read anywhere
-- features: jsonb blob never queried (features built in-app from DB values)
-- created_at: no timestamp needed; ordering done by stars_price

alter table public.subscription_plans
  drop column description,
  drop column max_community_themes,
  drop column features,
  drop column created_at;
