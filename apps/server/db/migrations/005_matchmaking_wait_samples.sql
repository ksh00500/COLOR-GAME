create table if not exists matchmaking_wait_samples (
  id bigserial primary key,
  mode text not null check (mode in ('casual', 'ranked')),
  segment text not null check (
    segment in ('guest', 'blank', 'red', 'orange', 'yellow', 'green', 'blue', 'navy', 'violet')
  ),
  account_id text references accounts(id) on delete set null,
  wait_ms integer not null check (wait_ms >= 0 and wait_ms <= 3600000),
  matched_at timestamptz not null default now()
);

create index if not exists matchmaking_wait_samples_segment_idx
  on matchmaking_wait_samples(mode, segment, matched_at desc);

create index if not exists matchmaking_wait_samples_mode_idx
  on matchmaking_wait_samples(mode, matched_at desc);
