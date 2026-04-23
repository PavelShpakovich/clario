-- Add a `free` flag to report_products.
-- When true, no credits are deducted for this product; access is granted automatically.
alter table public.report_products
  add column if not exists free boolean not null default false;

-- Grant/revoke on existing products can be set via the admin pricing UI.
-- By default all products remain paid (free = false).
