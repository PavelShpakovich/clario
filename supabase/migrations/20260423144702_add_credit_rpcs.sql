create or replace function public.deduct_credits_atomic(
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
  v_current_balance integer;
  v_new_balance     integer;
  v_txn_id          uuid;
begin
  if p_amount <= 0 then
    raise exception 'deduct amount must be positive, got %', p_amount;
  end if;

  select balance into v_current_balance
    from public.user_credits
    where user_id = p_user_id
    for update;

  if not found then
    raise exception 'INSUFFICIENT_CREDITS:0:%', p_amount;
  end if;

  if v_current_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS:%:%', v_current_balance, p_amount;
  end if;

  v_new_balance := v_current_balance - p_amount;

  update public.user_credits
    set balance = v_new_balance,
        updated_at = now()
    where user_id = p_user_id;

  insert into public.credit_transactions
    (user_id, amount, balance_after, reason, reference_type, reference_id, note)
  values
    (p_user_id, -p_amount, v_new_balance, p_reason, p_reference_type, p_reference_id, p_note)
  returning id into v_txn_id;

  return query select v_new_balance, v_txn_id;
end;
$$;
