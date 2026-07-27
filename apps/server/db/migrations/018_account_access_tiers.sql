alter table accounts
  add column if not exists access_tier text not null default 'player';

alter table accounts
  drop constraint if exists accounts_access_tier_check;

alter table accounts
  add constraint accounts_access_tier_check
  check (access_tier in ('player', 'tester', 'admin'));

create index if not exists accounts_access_tier_idx
  on accounts (access_tier)
  where access_tier <> 'player';
