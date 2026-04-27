-- Fix: add 'welcome_bonus' to credit_transactions.reason CHECK constraint.
-- Without this, the add_credits RPC fails with a constraint violation
-- when granting welcome credits during user registration.

alter table public.credit_transactions
  drop constraint if exists credit_transactions_reason_check;

alter table public.credit_transactions
  add constraint credit_transactions_reason_check
    check (reason in (
      'pack_purchase',
      'admin_grant',
      'admin_revoke',
      'reading_debit',
      'compatibility_debit',
      'forecast_pack_debit',
      'chat_pack_debit',
      'refund_llm_failure',
      'refund_admin',
      'welcome_bonus'
    ));

-- Backfill: grant 5 welcome credits to existing users who never received them.
-- These users registered while the CHECK constraint was missing 'welcome_bonus'.
insert into public.user_credits (user_id, balance)
select p.id, 5
from public.profiles p
where not exists (
  select 1 from public.user_credits uc where uc.user_id = p.id
)
on conflict (user_id) do nothing;

insert into public.credit_transactions (user_id, amount, balance_after, reason, note)
select uc.user_id, 5, uc.balance, 'welcome_bonus', 'Backfill: welcome bonus missed due to constraint bug'
from public.user_credits uc
where not exists (
  select 1 from public.credit_transactions ct
  where ct.user_id = uc.user_id
    and ct.reason = 'welcome_bonus'
);
