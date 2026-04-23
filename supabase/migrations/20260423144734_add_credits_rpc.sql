create or replace function public.add_credits(
  p_user_id        uuid,
  p_amount         integer,
  p_reason         text,
  p_reference_type text default null,
  p_reference_id   uuid default null,
  p_note           text default null
)
returns table(new_balance integer, transaction_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
  v_txn_id      uuid;
begin
  if p_amount <= 0 then
    raise exception 'add amount must be positive, got %', p_amount;
  end if;

  insert into public.user_credits (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
    set balance = public.user_credits.balance + p_amount,
        updated_at = now()
  returning balance into v_new_balance;

  insert into public.credit_transactions
    (user_id, amount, balance_after, reason, reference_type, reference_id, note)
  values
    (p_user_id, p_amount, v_new_balance, p_reason, p_reference_type, p_reference_id, p_note)
  returning id into v_txn_id;

  return query select v_new_balance, v_txn_id;
end;
$$;
