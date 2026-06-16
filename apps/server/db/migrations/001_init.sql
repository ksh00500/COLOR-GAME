create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists game_rooms (
  code text primary key,
  status text not null check (status in ('waiting', 'playing', 'finished')),
  host_player_id text not null,
  current_game_id text,
  last_snapshot jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists game_room_players (
  room_code text not null references game_rooms(code) on delete cascade,
  player_id text not null,
  seat_index integer not null check (seat_index in (0, 1)),
  nickname text not null,
  avatar_id text not null,
  is_guest boolean not null default true,
  ready boolean not null default false,
  connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  primary key (room_code, player_id)
);

create table if not exists games (
  id text primary key,
  room_code text not null references game_rooms(code) on delete cascade,
  status text not null check (status in ('waiting', 'countdown', 'playing', 'finished')),
  mode text not null,
  current_player_id text,
  winner_id text,
  result text,
  turn_number integer not null,
  state jsonb not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  updated_at timestamptz not null
);

create table if not exists game_moves (
  id bigserial primary key,
  game_id text not null references games(id) on delete cascade,
  room_code text not null references game_rooms(code) on delete cascade,
  player_id text not null,
  turn_number integer not null,
  row_index integer not null,
  col_index integer not null,
  color text not null,
  earned_score integer not null default 0,
  scoring_lines jsonb not null,
  removed_cells jsonb not null,
  created_at timestamptz not null,
  unique (game_id, turn_number)
);

create index if not exists game_rooms_status_idx on game_rooms(status);
create index if not exists game_rooms_updated_at_idx on game_rooms(updated_at desc);
create index if not exists games_room_code_idx on games(room_code);
create index if not exists game_moves_game_id_idx on game_moves(game_id, turn_number);
