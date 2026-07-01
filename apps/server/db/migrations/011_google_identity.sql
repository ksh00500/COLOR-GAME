alter table accounts
  alter column password_hash drop not null;

create table if not exists account_identities (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  provider_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject),
  unique (account_id, provider),
  check (provider in ('google'))
);

create index if not exists account_identities_account_idx
  on account_identities(account_id);

create index if not exists account_identities_email_idx
  on account_identities(provider, provider_email);
