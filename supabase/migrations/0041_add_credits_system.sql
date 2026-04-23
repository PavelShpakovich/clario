-- ============================================================================
-- Credits system: packs, balances, transactions, atomic deduction RPC
-- ============================================================================

-- ── credit_packs ────────────────────────────────────────────────────────────

create table public.credit_packs (
  id          text primary key,
  name        text not null,
  credits     integer not null check (credits > 0),
  price_minor integer,
  currency    text not null default 'BYN',
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.credit_packs enable row level security;

create policy "credit_packs: active read"
  on public.credit_packs for select
  using (active = true);

insert into public.credit_packs (id, name, credits, price_minor, currency, active, sort_order)
values
  ('starter',  'Starter',  3,  null, 'BYN', true, 1),
  ('standard', 'Standard', 7,  null, 'BYN', true, 2),
  ('premium',  'Premium',  15, null, 'BYN', true, 3);

comment on table public.credit_packs is
  'Purchasable credit pack catalog. Prices set to null until payment processor is confirmed.';

-- ── user_credits ────────────────────────────────────────────────────────────

create table public.user_credits (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  balance               integer not null default 0 check (balance >= 0),
  forecast_access_until timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint uq_user_credits_user_id unique (user_id)
);

alter table public.user_credits enable row level security;

create policy "user_credits: owner read"
  on public.user_credits for select
  using (auth.uid() = user_id);

comment on table public.user_credits is
  'Per-user credit balance. Writes happen only through service_role (server-side).';

-- ── credit_transactions ─────────────────────────────────────────────────────

create table public.credit_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  amount          integer not null,
  balance_after   integer not null,
  reason          text not null
                    check (reason in (
                      'pack_purchase',
                      'admin_grant',
                      'admin_revoke',
                      'reading_debit',
                      'compatibility_debit',
                      'forecast_pack_debit',
                      'chat_pack_debit',
                      'refund_llm_failure',
                      'refund_admin'
                    )),
  reference_type  text
                    check (reference_type is null or reference_type in (
                      'reading', 'compatibility_report', 'forecast', 'follow_up', 'purchase'
                    )),
  reference_id    uuid,
  note            text,
  created_at      timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;

create policy "credit_transactions: owner read"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

create index idx_credit_transactions_user
  on public.credit_transactions(user_id, created_at desc);

comment on table public.credit_transactions is
  'Immutable audit ledger for all credit movements. Positive amount = credit, negative = debit.';

-- ── Add credit_cost to report_products ──────────────────────────────────────

alter table public.report_products
  add column credit_cost integer;

comment on column public.report_products.credit_cost is
  'Number of credits required to generate this product. Admin-editable for dynamic pricing.';

update public.report_products set credit_cost = 2  where id = 'extended_natal_report';
update public.report_products set credit_cost = 3  where id = 'compatibility_report_purchase';
update public.report_products set credit_cost = 2  where id = 'forecast_report_purchase';
update public.report_products set credit_cost = 1  where id = 'follow_up_pack';
