-- ============================================================
-- Add privacy controls to themes and cards
-- ============================================================

-- Add is_public column to themes (default: false = private)
alter table public.themes 
  add column if not exists is_public boolean default false;

-- Add is_public column to cards (default: false = private)
alter table public.cards 
  add column if not exists is_public boolean default false;

-- Update RLS policies to allow reading public themes
drop policy if exists "themes: owner all" on public.themes;

create policy "themes: owner all"
  on public.themes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "themes: read public"
  on public.themes for select
  using (is_public = true);

-- Update RLS policies to allow reading public cards
drop policy if exists "cards: owner all" on public.cards;
drop policy if exists "cards: read global" on public.cards;

create policy "cards: owner all"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cards: read public"
  on public.cards for select
  using (is_public = true);

-- Every authenticated user can read global cards (user_id IS NULL) - kept for backward compat
create policy "cards: read global"
  on public.cards for select
  using (auth.role() = 'authenticated' and user_id is null);

