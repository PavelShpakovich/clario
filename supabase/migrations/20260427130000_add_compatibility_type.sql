-- Add compatibility_type column to compatibility_reports.
-- Allows reports to be categorized as romantic, friendship, business, or family.
-- Existing reports default to 'romantic' for backward compatibility.

alter table public.compatibility_reports
  add column compatibility_type text not null default 'romantic'
    check (compatibility_type in ('romantic', 'friendship', 'business', 'family'));
