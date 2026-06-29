create table if not exists economy_wallets (
  account_id text primary key references accounts(id) on delete cascade,
  color_chips integer not null default 0 check (color_chips >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists economy_wallet_ledger (
  id bigserial primary key,
  account_id text not null references accounts(id) on delete cascade,
  delta integer not null,
  reason text not null,
  source_key text not null,
  balance_after integer not null check (balance_after >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, source_key)
);

create index if not exists economy_wallet_ledger_account_idx
  on economy_wallet_ledger(account_id, created_at desc);

create table if not exists economy_fragments (
  account_id text not null references accounts(id) on delete cascade,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, rarity)
);

create table if not exists cosmetic_catalog (
  id text primary key,
  category text not null check (
    category in ('tile_color', 'placement_effect', 'score_effect', 'profile', 'victory_effect')
  ),
  equip_slot text not null check (
    equip_slot in (
      'tile_color', 'placement_effect', 'score_effect', 'victory_effect',
      'profile_frame', 'profile_badge', 'profile_title'
    )
  ),
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  name_ko text not null,
  name_en text not null,
  localized_names jsonb not null default '{}'::jsonb,
  description_ko text not null,
  chip_price integer not null default 0 check (chip_price >= 0),
  visual_kind text not null check (visual_kind in ('solid', 'split', 'gradient', 'pattern', 'placeholder')),
  visual_config jsonb not null default '{}'::jsonb,
  representative_color text,
  availability text not null default 'active' check (availability in ('active', 'upcoming', 'pack_only')),
  available_in_weekly_store boolean not null default false,
  available_in_boxes boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists account_cosmetics (
  account_id text not null references accounts(id) on delete cascade,
  cosmetic_id text not null references cosmetic_catalog(id) on delete cascade,
  source text not null,
  acquired_at timestamptz not null default now(),
  primary key (account_id, cosmetic_id)
);

create table if not exists account_loadouts (
  account_id text primary key references accounts(id) on delete cascade,
  tile_color_a_id text references cosmetic_catalog(id) on delete set null,
  tile_color_b_id text references cosmetic_catalog(id) on delete set null,
  tile_color_c_id text references cosmetic_catalog(id) on delete set null,
  placement_effect_id text references cosmetic_catalog(id) on delete set null,
  score_effect_id text references cosmetic_catalog(id) on delete set null,
  victory_effect_id text references cosmetic_catalog(id) on delete set null,
  profile_frame_id text references cosmetic_catalog(id) on delete set null,
  profile_badge_id text references cosmetic_catalog(id) on delete set null,
  profile_title_id text references cosmetic_catalog(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists economy_quest_unlocks (
  account_id text not null references accounts(id) on delete cascade,
  quest_key text not null check (quest_key in ('welcome', 'attendance', 'attendance_streak', 'first_online_win')),
  cycle_key text not null,
  reward_chips integer not null check (reward_chips > 0),
  progress integer not null default 1 check (progress >= 0),
  goal integer not null default 1 check (goal > 0),
  status text not null default 'unlocked' check (status in ('unlocked', 'claimed')),
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (account_id, quest_key, cycle_key)
);

create table if not exists economy_match_rewards (
  account_id text not null references accounts(id) on delete cascade,
  game_id text not null,
  day_key text not null,
  opponent_key text not null,
  won boolean not null,
  reward_chips integer not null default 4,
  rewarded_at timestamptz not null default now(),
  primary key (account_id, game_id)
);

create index if not exists economy_match_rewards_daily_idx
  on economy_match_rewards(account_id, day_key, opponent_key);

create table if not exists weekly_store_rotations (
  week_key text primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists weekly_store_items (
  week_key text not null references weekly_store_rotations(week_key) on delete cascade,
  cosmetic_id text not null references cosmetic_catalog(id) on delete cascade,
  display_order integer not null,
  primary key (week_key, cosmetic_id),
  unique (week_key, display_order)
);

create table if not exists cosmetic_box_openings (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  price_chips integer not null,
  outcome_type text not null check (outcome_type in ('fragment', 'cosmetic')),
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  cosmetic_id text references cosmetic_catalog(id) on delete set null,
  fragment_quantity integer not null default 0,
  probability_version text not null,
  roll integer not null check (roll >= 0 and roll < 10000),
  opened_at timestamptz not null default now()
);

create index if not exists cosmetic_box_openings_account_idx
  on cosmetic_box_openings(account_id, opened_at desc);

create table if not exists account_entitlements (
  account_id text not null references accounts(id) on delete cascade,
  entitlement text not null check (entitlement in ('founder', 'premium')),
  status text not null check (status in ('active', 'revoked')),
  source_product_id text,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, entitlement)
);

create table if not exists monetization_config (
  id boolean primary key default true check (id),
  monetization_enabled boolean not null default false,
  reward_ads_enabled boolean not null default false,
  founder_sale_starts_at timestamptz,
  founder_sale_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into monetization_config (id)
values (true)
on conflict (id) do nothing;

create table if not exists monetization_products (
  id text primary key check (id in ('founder_pack', 'premium_pack')),
  reference_price_krw integer not null check (reference_price_krw > 0),
  bonus_chips integer not null default 0 check (bonus_chips >= 0),
  provider_product_id text,
  active boolean not null default true
);

insert into monetization_products (id, reference_price_krw, bonus_chips)
values
  ('founder_pack', 9900, 500),
  ('premium_pack', 6900, 0)
on conflict (id) do update set
  reference_price_krw = excluded.reference_price_krw,
  bonus_chips = excluded.bonus_chips;

create table if not exists monetization_product_contents (
  product_id text not null references monetization_products(id) on delete cascade,
  cosmetic_id text not null references cosmetic_catalog(id) on delete cascade,
  primary key (product_id, cosmetic_id)
);

create table if not exists ad_reward_sessions (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  day_key text not null,
  status text not null check (status in ('created', 'verified', 'expired')),
  reward_chips integer not null default 12,
  admob_transaction_id text unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists ad_reward_sessions_daily_idx
  on ad_reward_sessions(account_id, day_key, status);

insert into cosmetic_catalog (
  id, category, equip_slot, rarity, name_ko, name_en, description_ko, chip_price,
  visual_kind, visual_config, representative_color, availability,
  available_in_weekly_store, available_in_boxes
)
values
  ('tile-cherry', 'tile_color', 'tile_color', 'common', '체리', 'Cherry', '선명한 체리 단색 타일', 150, 'solid', '{"colors":["#d93f5c"]}', '#d93f5c', 'active', true, true),
  ('tile-coral', 'tile_color', 'tile_color', 'common', '코랄', 'Coral', '따뜻한 코랄 단색 타일', 150, 'solid', '{"colors":["#ef715f"]}', '#ef715f', 'active', true, true),
  ('tile-tangerine', 'tile_color', 'tile_color', 'common', '탠저린', 'Tangerine', '생기 있는 귤빛 단색 타일', 150, 'solid', '{"colors":["#ed8a34"]}', '#ed8a34', 'active', true, true),
  ('tile-gold', 'tile_color', 'tile_color', 'common', '골드', 'Gold', '밝은 금빛 단색 타일', 150, 'solid', '{"colors":["#ddb83f"]}', '#ddb83f', 'active', true, true),
  ('tile-lime', 'tile_color', 'tile_color', 'common', '라임', 'Lime', '산뜻한 라임 단색 타일', 150, 'solid', '{"colors":["#94c94a"]}', '#94c94a', 'active', true, true),
  ('tile-emerald', 'tile_color', 'tile_color', 'common', '에메랄드', 'Emerald', '깊은 에메랄드 단색 타일', 150, 'solid', '{"colors":["#31a56f"]}', '#31a56f', 'active', true, true),
  ('tile-mint', 'tile_color', 'tile_color', 'common', '민트', 'Mint', '부드러운 민트 단색 타일', 150, 'solid', '{"colors":["#64c9a8"]}', '#64c9a8', 'active', true, true),
  ('tile-aqua', 'tile_color', 'tile_color', 'common', '아쿠아', 'Aqua', '맑은 아쿠아 단색 타일', 150, 'solid', '{"colors":["#3fc2c9"]}', '#3fc2c9', 'active', true, true),
  ('tile-sky', 'tile_color', 'tile_color', 'common', '스카이', 'Sky', '가벼운 하늘빛 단색 타일', 150, 'solid', '{"colors":["#55a8e2"]}', '#55a8e2', 'active', true, true),
  ('tile-cobalt', 'tile_color', 'tile_color', 'common', '코발트', 'Cobalt', '짙은 코발트 단색 타일', 150, 'solid', '{"colors":["#4268d5"]}', '#4268d5', 'active', true, true),
  ('tile-indigo', 'tile_color', 'tile_color', 'common', '인디고', 'Indigo', '차분한 남색 단색 타일', 150, 'solid', '{"colors":["#5552a8"]}', '#5552a8', 'active', true, true),
  ('tile-violet', 'tile_color', 'tile_color', 'common', '바이올렛', 'Violet', '선명한 보랏빛 단색 타일', 150, 'solid', '{"colors":["#8655c7"]}', '#8655c7', 'active', true, true),
  ('tile-magenta', 'tile_color', 'tile_color', 'common', '마젠타', 'Magenta', '화사한 마젠타 단색 타일', 150, 'solid', '{"colors":["#c94c9b"]}', '#c94c9b', 'active', true, true),
  ('tile-slate', 'tile_color', 'tile_color', 'common', '슬레이트', 'Slate', '절제된 회청색 단색 타일', 150, 'solid', '{"colors":["#637887"]}', '#637887', 'active', true, true),

  ('tile-sunset', 'tile_color', 'tile_color', 'rare', '노을', 'Sunset', '코랄과 오렌지가 반으로 나뉜 타일', 400, 'split', '{"colors":["#ef635f","#f3a23b"]}', '#ee7950', 'active', true, true),
  ('tile-citrus', 'tile_color', 'tile_color', 'rare', '시트러스', 'Citrus', '레몬과 라임이 반으로 나뉜 타일', 400, 'split', '{"colors":["#e8cf42","#82c64b"]}', '#b5ca46', 'active', true, true),
  ('tile-forest-lake', 'tile_color', 'tile_color', 'rare', '숲의 호수', 'Forest Lake', '에메랄드와 청록이 만나는 타일', 400, 'split', '{"colors":["#278b62","#2aa6a3"]}', '#299879', 'active', true, true),
  ('tile-lagoon', 'tile_color', 'tile_color', 'rare', '라군', 'Lagoon', '아쿠아와 파랑이 나뉜 타일', 400, 'split', '{"colors":["#3cc7c6","#397fd2"]}', '#3aa3cc', 'active', true, true),
  ('tile-twilight', 'tile_color', 'tile_color', 'rare', '황혼', 'Twilight', '남색과 보라가 나뉜 타일', 400, 'split', '{"colors":["#3f5198","#8650a8"]}', '#636092', 'active', true, true),
  ('tile-orchid', 'tile_color', 'tile_color', 'rare', '오키드', 'Orchid', '보라와 분홍이 나뉜 타일', 400, 'split', '{"colors":["#8a55bc","#d45f9d"]}', '#ad5aa8', 'active', true, true),
  ('tile-berry', 'tile_color', 'tile_color', 'rare', '베리', 'Berry', '체리와 자주가 나뉜 타일', 400, 'split', '{"colors":["#c53e61","#7d3e91"]}', '#a14278', 'active', true, true),
  ('tile-fire-ice', 'tile_color', 'tile_color', 'rare', '불꽃과 얼음', 'Fire and Ice', '붉은 불꽃과 푸른 얼음이 맞닿은 타일', 400, 'split', '{"colors":["#e24c3f","#4daee5"]}', '#9d788d', 'active', true, true),
  ('tile-gold-navy', 'tile_color', 'tile_color', 'rare', '골드 네이비', 'Gold Navy', '금빛과 남색이 반으로 나뉜 타일', 400, 'split', '{"colors":["#d8b34a","#253b69"]}', '#7f775a', 'active', true, true),
  ('tile-mono', 'tile_color', 'tile_color', 'rare', '모노', 'Mono', '밝음과 어둠이 선명하게 나뉜 타일', 400, 'split', '{"colors":["#e7e8ea","#32363d"]}', '#888b90', 'active', true, true),

  ('tile-aurora', 'tile_color', 'tile_color', 'epic', '오로라', 'Aurora', '초록·청록·보라가 흐르는 그라데이션', 800, 'gradient', '{"colors":["#55d58c","#42b9c8","#865bd5"]}', '#54a8ad', 'active', true, true),
  ('tile-solar-flare', 'tile_color', 'tile_color', 'epic', '태양 폭발', 'Solar Flare', '노랑에서 붉은빛으로 번지는 그라데이션', 800, 'gradient', '{"colors":["#f3dc56","#f19a3f","#df4e4e"]}', '#ec9450', 'active', true, true),
  ('tile-ocean-depth', 'tile_color', 'tile_color', 'epic', '심해', 'Ocean Depth', '아쿠아에서 짙은 남색으로 가라앉는 그라데이션', 800, 'gradient', '{"colors":["#40ced0","#3977bf","#202f61"]}', '#3a7e9c', 'active', true, true),
  ('tile-neon-night', 'tile_color', 'tile_color', 'epic', '네온 나이트', 'Neon Night', '분홍·보라·파랑 네온 그라데이션', 800, 'gradient', '{"colors":["#f05cae","#9a55df","#477ee7"]}', '#a15fc7', 'active', true, true),
  ('tile-forest-mist', 'tile_color', 'tile_color', 'epic', '숲 안개', 'Forest Mist', '라임에서 청록으로 이어지는 그라데이션', 800, 'gradient', '{"colors":["#a7d957","#4dba73","#3a9e9b"]}', '#69b777', 'active', true, true),
  ('tile-cotton-candy', 'tile_color', 'tile_color', 'epic', '코튼 캔디', 'Cotton Candy', '분홍과 하늘빛이 부드럽게 섞인 그라데이션', 800, 'gradient', '{"colors":["#ef8eb8","#bb8ed9","#74b9e8"]}', '#bd9dce', 'active', true, true),
  ('tile-ember-sky', 'tile_color', 'tile_color', 'epic', '잿불 하늘', 'Ember Sky', '주황과 보랏빛 하늘의 그라데이션', 800, 'gradient', '{"colors":["#ee8846","#c95f76","#644eaa"]}', '#b76479', 'active', true, true),
  ('tile-moonlight', 'tile_color', 'tile_color', 'epic', '달빛', 'Moonlight', '은빛에서 남색으로 흐르는 그라데이션', 800, 'gradient', '{"colors":["#d7dde5","#7d9bc1","#414f8b"]}', '#8794b1', 'active', true, true),

  ('tile-cosmos', 'tile_color', 'tile_color', 'legendary', '코스모스', 'Cosmos', '별빛이 흐르는 우주 문양', 1600, 'pattern', '{"colors":["#17162f","#5c46a6","#39b8b3"],"pattern":"cosmos"}', '#574f93', 'active', true, true),
  ('tile-stained-glass', 'tile_color', 'tile_color', 'legendary', '스테인드글라스', 'Stained Glass', '빛나는 기하학 유리 문양', 1600, 'pattern', '{"colors":["#e85a6b","#e8c84f","#45a7c6"],"pattern":"stained-glass"}', '#a79678', 'active', true, true),
  ('tile-kintsugi', 'tile_color', 'tile_color', 'legendary', '킨츠기', 'Kintsugi', '검은 바탕 위로 금빛 균열이 흐르는 문양', 1600, 'pattern', '{"colors":["#202124","#d7ad45","#6e5524"],"pattern":"kintsugi"}', '#77673f', 'active', true, true),
  ('tile-tango-spectrum', 'tile_color', 'tile_color', 'legendary', 'Tango 스펙트럼', 'Tango Spectrum', 'Tango의 세 빛이 움직이는 리본 문양', 1600, 'pattern', '{"colors":["#d84d63","#36a173","#4d6ed7"],"pattern":"tango-spectrum"}', '#777f8a', 'active', true, true),

  ('founder-tile-crimson', 'tile_color', 'tile_color', 'legendary', '창립자 크림슨', 'Founder Crimson', '창립자 한정 타일 색', 0, 'pattern', '{"colors":["#541f2c","#d3a052","#f1d39a"],"pattern":"founder"}', '#9b6e56', 'pack_only', false, false),
  ('founder-tile-emerald', 'tile_color', 'tile_color', 'legendary', '창립자 에메랄드', 'Founder Emerald', '창립자 한정 타일 색', 0, 'pattern', '{"colors":["#163f36","#d3a052","#78c7a4"],"pattern":"founder"}', '#6b8665', 'pack_only', false, false),
  ('founder-tile-cobalt', 'tile_color', 'tile_color', 'legendary', '창립자 코발트', 'Founder Cobalt', '창립자 한정 타일 색', 0, 'pattern', '{"colors":["#1c2d58","#d3a052","#7898df"],"pattern":"founder"}', '#77776d', 'pack_only', false, false),
  ('founder-profile-frame', 'profile', 'profile_frame', 'legendary', '창립자 프레임', 'Founder Frame', '창립자 한정 프로필 프레임', 0, 'placeholder', '{}', null, 'upcoming', false, false),
  ('founder-profile-badge', 'profile', 'profile_badge', 'legendary', '창립자 배지', 'Founder Badge', '창립자 한정 프로필 배지', 0, 'placeholder', '{}', null, 'upcoming', false, false),
  ('founder-profile-title', 'profile', 'profile_title', 'legendary', '창립자', 'Founder', '창립자 한정 칭호', 0, 'placeholder', '{}', null, 'upcoming', false, false),
  ('founder-victory-effect', 'victory_effect', 'victory_effect', 'legendary', '창립자 피날레', 'Founder Finale', '창립자 한정 승리 연출', 0, 'placeholder', '{}', null, 'upcoming', false, false),
  ('premium-profile-frame', 'profile', 'profile_frame', 'epic', '프리미엄 프레임', 'Premium Frame', '프리미엄 전용 프로필 프레임', 0, 'placeholder', '{}', null, 'upcoming', false, false),
  ('premium-profile-badge', 'profile', 'profile_badge', 'epic', '프리미엄 배지', 'Premium Badge', '프리미엄 전용 프로필 배지', 0, 'placeholder', '{}', null, 'upcoming', false, false)
on conflict (id) do update set
  category = excluded.category,
  equip_slot = excluded.equip_slot,
  rarity = excluded.rarity,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  localized_names = jsonb_build_object(
    'ko', excluded.name_ko,
    'en', excluded.name_en,
    'ja', excluded.name_en,
    'es', excluded.name_en,
    'pt-BR', excluded.name_en
  ),
  description_ko = excluded.description_ko,
  chip_price = excluded.chip_price,
  visual_kind = excluded.visual_kind,
  visual_config = excluded.visual_config,
  representative_color = excluded.representative_color,
  availability = excluded.availability,
  available_in_weekly_store = excluded.available_in_weekly_store,
  available_in_boxes = excluded.available_in_boxes,
  active = true;

update cosmetic_catalog
set localized_names = jsonb_build_object(
  'ko', name_ko,
  'en', name_en,
  'ja', name_en,
  'es', name_en,
  'pt-BR', name_en
)
where localized_names = '{}'::jsonb;

insert into monetization_product_contents (product_id, cosmetic_id)
values
  ('founder_pack', 'founder-tile-crimson'),
  ('founder_pack', 'founder-tile-emerald'),
  ('founder_pack', 'founder-tile-cobalt'),
  ('founder_pack', 'founder-profile-frame'),
  ('founder_pack', 'founder-profile-badge'),
  ('founder_pack', 'founder-profile-title'),
  ('founder_pack', 'founder-victory-effect'),
  ('premium_pack', 'premium-profile-frame'),
  ('premium_pack', 'premium-profile-badge')
on conflict do nothing;
