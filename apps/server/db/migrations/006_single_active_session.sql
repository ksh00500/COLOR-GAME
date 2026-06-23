alter table accounts
  add column if not exists active_session_id text;

create index if not exists accounts_active_session_idx
  on accounts(id, active_session_id)
  where active_session_id is not null;
