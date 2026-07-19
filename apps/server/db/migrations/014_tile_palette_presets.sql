create table if not exists account_tile_palettes (
  account_id text not null references accounts(id) on delete cascade,
  slot_index smallint not null check (slot_index between 1 and 3),
  name text check (name is null or char_length(name) between 1 and 24),
  tile_color_a_id text references cosmetic_catalog(id) on delete set null,
  tile_color_b_id text references cosmetic_catalog(id) on delete set null,
  tile_color_c_id text references cosmetic_catalog(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, slot_index)
);

insert into account_tile_palettes (
  account_id,
  slot_index,
  tile_color_a_id,
  tile_color_b_id,
  tile_color_c_id
)
select
  account_id,
  1,
  tile_color_a_id,
  tile_color_b_id,
  tile_color_c_id
from account_loadouts
where tile_color_a_id is not null
   or tile_color_b_id is not null
   or tile_color_c_id is not null
on conflict (account_id, slot_index) do nothing;
