alter table public.generation_logs
  add column if not exists usage_tokens integer;

comment on column public.generation_logs.usage_tokens is
  'Provider-reported total token usage for the AI operation when available.';