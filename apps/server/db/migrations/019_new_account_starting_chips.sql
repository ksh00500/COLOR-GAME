create or replace function initialize_tango_economy_account()
returns trigger
language plpgsql
as $$
begin
  insert into economy_wallets (
    account_id,
    color_chips,
    lifetime_earned
  ) values (
    new.id,
    500,
    500
  )
  on conflict (account_id) do nothing;

  insert into economy_wallet_ledger (
    account_id,
    delta,
    reason,
    source_key,
    balance_after,
    metadata
  ) values (
    new.id,
    500,
    'account_created',
    'account:initial:500',
    500,
    '{"automatic": true}'::jsonb
  )
  on conflict (account_id, source_key) do nothing;

  return new;
end;
$$;

drop trigger if exists initialize_tango_economy_account_trigger on accounts;

create trigger initialize_tango_economy_account_trigger
after insert on accounts
for each row
execute function initialize_tango_economy_account();

delete from economy_quest_unlocks
where quest_key = 'welcome';
