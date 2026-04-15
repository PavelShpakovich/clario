-- Drop tables that are defined in the schema but have zero application-code references.
--
-- telegram_link_tokens: the Telegram integration was removed (routes, components,
--   and hooks all deleted). This table is orphaned.
--
-- prompt_templates: prompts are hardcoded in src/lib/readings/prompt.ts and related
--   service files. The table was never queried by the application layer.

drop table if exists public.telegram_link_tokens cascade;
drop table if exists public.prompt_templates cascade;
