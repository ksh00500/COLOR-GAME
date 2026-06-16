create table if not exists visitor_sessions (
  visitor_id text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  last_path text
);

create index if not exists visitor_sessions_last_seen_idx on visitor_sessions(last_seen_at desc);
