alter table accounts
  add column if not exists is_matchmaking_bot boolean not null default false;

alter table accounts
  add column if not exists bot_difficulty text;

alter table accounts
  add column if not exists bot_match_mode text;

alter table accounts
  drop constraint if exists accounts_bot_difficulty_check;

alter table accounts
  add constraint accounts_bot_difficulty_check
  check (bot_difficulty is null or bot_difficulty in ('easy', 'normal', 'hard'));

alter table accounts
  drop constraint if exists accounts_bot_match_mode_check;

alter table accounts
  add constraint accounts_bot_match_mode_check
  check (bot_match_mode is null or bot_match_mode in ('casual', 'ranked'));

create or replace function initialize_tango_economy_account()
returns trigger
language plpgsql
as $$
begin
  if new.is_matchmaking_bot then
    return new;
  end if;

  insert into economy_wallets (account_id, color_chips, lifetime_earned)
  values (new.id, 500, 500)
  on conflict (account_id) do nothing;

  insert into economy_wallet_ledger (
    account_id, delta, reason, source_key, balance_after, metadata
  ) values (
    new.id, 500, 'account_created', 'account:initial:500', 500,
    '{"automatic": true}'::jsonb
  )
  on conflict (account_id, source_key) do nothing;

  return new;
end;
$$;

insert into accounts (
  id, email, display_name, avatar_id, password_hash,
  is_matchmaking_bot, bot_difficulty, bot_match_mode
)
values
  ('tango-bot-casual-easy-jeti', 'jeti@matchmaking.tango.invalid', '제티', 'orbit', 'LOGIN_DISABLED', true, 'easy', 'casual'),
  ('tango-bot-casual-easy-el', 'el@matchmaking.tango.invalid', '엘', 'prism', 'LOGIN_DISABLED', true, 'easy', 'casual'),
  ('tango-bot-casual-normal-daesanghyeok', 'daesanghyeok@matchmaking.tango.invalid', '대상혁', 'orbit', 'LOGIN_DISABLED', true, 'normal', 'casual'),
  ('tango-bot-casual-normal-gommungchi', 'gommungchi@matchmaking.tango.invalid', '곰뭉치', 'prism', 'LOGIN_DISABLED', true, 'normal', 'casual'),
  ('tango-bot-casual-hard-byeongchan', 'byeongchan@matchmaking.tango.invalid', '병찬', 'orbit', 'LOGIN_DISABLED', true, 'hard', 'casual'),
  ('tango-bot-ranked-hard-kimsin', 'kimsin@matchmaking.tango.invalid', '김신', 'prism', 'LOGIN_DISABLED', true, 'hard', 'ranked'),
  ('tango-bot-ranked-hard-waterlion', 'waterlion@matchmaking.tango.invalid', 'waterlion', 'orbit', 'LOGIN_DISABLED', true, 'hard', 'ranked')
on conflict (id) do update set
  display_name = excluded.display_name,
  avatar_id = excluded.avatar_id,
  password_hash = excluded.password_hash,
  is_matchmaking_bot = true,
  bot_difficulty = excluded.bot_difficulty,
  bot_match_mode = excluded.bot_match_mode,
  updated_at = now();

delete from economy_wallet_ledger
where account_id in (select id from accounts where is_matchmaking_bot);

delete from economy_wallets
where account_id in (select id from accounts where is_matchmaking_bot);

create index if not exists accounts_matchmaking_bot_idx
  on accounts (bot_match_mode, bot_difficulty)
  where is_matchmaking_bot;
