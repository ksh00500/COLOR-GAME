create table if not exists accounts (
  id text primary key,
  email text not null unique,
  display_name text not null,
  avatar_id text not null,
  password_hash text not null,
  rating integer not null default 1000,
  games_played integer not null default 0,
  ranked_wins integer not null default 0,
  ranked_losses integer not null default 0,
  ranked_draws integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table game_rooms
  add column if not exists mode text not null default 'private';

alter table game_room_players
  add column if not exists account_id text references accounts(id) on delete set null;

create table if not exists match_results (
  game_id text primary key references games(id) on delete cascade,
  room_code text not null references game_rooms(code) on delete cascade,
  mode text not null,
  player_one_account_id text references accounts(id) on delete set null,
  player_two_account_id text references accounts(id) on delete set null,
  player_one_nickname text not null,
  player_two_nickname text not null,
  winner_account_id text references accounts(id) on delete set null,
  result text,
  rating_before jsonb not null default '{}'::jsonb,
  rating_after jsonb not null default '{}'::jsonb,
  turn_number integer not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists accounts_rating_idx on accounts(rating desc, games_played desc);
create index if not exists match_results_p1_idx on match_results(player_one_account_id, finished_at desc);
create index if not exists match_results_p2_idx on match_results(player_two_account_id, finished_at desc);
create index if not exists match_results_finished_idx on match_results(finished_at desc);
