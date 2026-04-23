-- Returns the `kind` values of all report_products that are currently free.
-- Uses a stored function so callers never depend on PostgREST's column-schema
-- cache knowing about the `free` column.  PostgREST executes function bodies
-- as raw SQL on the PostgreSQL side, so missing-column cache issues don't apply.
create or replace function public.get_free_product_kinds()
returns text[]
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(array_agg(kind), array[]::text[])
  from public.report_products
  where free is true;
$$;

-- Reload PostgREST schema cache so it immediately picks up:
--   • the new function above
--   • the `free` column added in the previous migration
-- Without this, newly added columns / functions can take minutes to appear.
notify pgrst, 'reload schema';
