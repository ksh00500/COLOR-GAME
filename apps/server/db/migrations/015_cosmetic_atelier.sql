alter table cosmetic_catalog drop constraint if exists cosmetic_catalog_category_check;
alter table cosmetic_catalog add constraint cosmetic_catalog_category_check check (
  category in ('tile_color', 'board_theme', 'placement_effect', 'score_effect', 'profile', 'victory_effect')
);

alter table cosmetic_catalog drop constraint if exists cosmetic_catalog_equip_slot_check;
alter table cosmetic_catalog add constraint cosmetic_catalog_equip_slot_check check (
  equip_slot in (
    'tile_color', 'board_theme', 'placement_effect', 'score_effect', 'victory_effect',
    'profile_frame', 'profile_badge', 'profile_title'
  )
);

alter table cosmetic_catalog drop constraint if exists cosmetic_catalog_visual_kind_check;
alter table cosmetic_catalog add constraint cosmetic_catalog_visual_kind_check check (
  visual_kind in ('solid', 'split', 'gradient', 'pattern', 'placeholder', 'board', 'placement', 'score', 'victory')
);

alter table cosmetic_catalog add column if not exists collection_key text;
alter table cosmetic_catalog add column if not exists duration_ms integer check (duration_ms is null or duration_ms between 0 and 3000);

alter table account_loadouts add column if not exists board_theme_id text references cosmetic_catalog(id) on delete set null;

create table if not exists account_cosmetic_wishlist (
  account_id text not null references accounts(id) on delete cascade,
  cosmetic_id text not null references cosmetic_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, cosmetic_id)
);

create table if not exists cosmetic_craft_history (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  mode text not null check (mode in ('random', 'targeted')),
  category text not null check (category in ('tile_color', 'board_theme', 'placement_effect', 'score_effect', 'victory_effect')),
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  cosmetic_id text not null references cosmetic_catalog(id) on delete cascade,
  fragments_spent integer not null check (fragments_spent in (4, 8)),
  created_at timestamptz not null default now()
);

alter table cosmetic_box_openings add column if not exists category text not null default 'tile_color';
alter table cosmetic_box_openings drop constraint if exists cosmetic_box_openings_category_check;
alter table cosmetic_box_openings add constraint cosmetic_box_openings_category_check check (
  category in ('tile_color', 'board_theme', 'placement_effect', 'score_effect', 'victory_effect')
);

with products(id, category, equip_slot, rarity, name_ko, name_en, description_ko, visual_kind, colors, preset, duration_ms, collection_key) as (
  values
    ('board-maple-studio','board_theme','board_theme','common','메이플 스튜디오','Maple Studio','밝고 정갈한 메이플 원목 게임판','board',array['#d9a45d','#8c572f'],'maple',null,'maple'),
    ('board-walnut-classic','board_theme','board_theme','common','월넛 클래식','Walnut Classic','차분하고 깊은 월넛 원목 게임판','board',array['#765038','#3e2b22'],'walnut',null,'walnut'),
    ('board-ivory-birch','board_theme','board_theme','common','아이보리 버치','Ivory Birch','산뜻한 아이보리 자작나무 게임판','board',array['#eadbbd','#aa8c66'],'birch',null,'ivory'),
    ('board-charcoal-oak','board_theme','board_theme','common','차콜 오크','Charcoal Oak','절제된 차콜빛 오크 게임판','board',array['#47433d','#242321'],'charcoal',null,'charcoal'),
    ('board-forest-moss','board_theme','board_theme','rare','포레스트 모스','Forest Moss','이끼빛 포인트가 스민 원목 게임판','board',array['#7e8b59','#483f2d'],'moss',null,'forest'),
    ('board-coastal-teak','board_theme','board_theme','rare','코스탈 티크','Coastal Teak','바닷바람을 닮은 청록빛 티크 게임판','board',array['#b68651','#397b7a'],'coastal',null,'coastal'),
    ('board-midnight-brass','board_theme','board_theme','rare','미드나이트 브라스','Midnight Brass','짙은 밤색과 황동 테두리의 게임판','board',array['#25262d','#b98d48'],'brass',null,'midnight'),
    ('board-moonlight-lacquer','board_theme','board_theme','epic','문라이트 래커','Moonlight Lacquer','은은한 달빛 광택의 옻칠 게임판','board',array['#343951','#a7b5d4'],'moonlight',null,'moonlight'),
    ('board-ember-workshop','board_theme','board_theme','epic','엠버 워크숍','Ember Workshop','따뜻한 불씨가 남은 공방 게임판','board',array['#6f3528','#d9773d'],'ember',null,'ember'),
    ('board-prism-marquetry','board_theme','board_theme','epic','프리즘 마케트리','Prism Marquetry','다색 상감 무늬를 절제해 담은 게임판','board',array['#725784','#3e8c83','#d0a858'],'prism',null,'prism'),
    ('board-cosmos-atelier','board_theme','board_theme','legendary','코스모스 아틀리에','Cosmos Atelier','별빛과 원목이 어우러진 고유 게임판','board',array['#17182f','#5b56a4','#3aa9a4'],'cosmos',null,'cosmos'),
    ('board-tango-master','board_theme','board_theme','legendary','Tango 마스터 보드','Tango Master Board','세 가지 Tango 컬러를 상감한 마스터 게임판','board',array['#a53f57','#36558d','#337565'],'tango',null,'tango'),

    ('place-maple-tap','placement_effect','placement_effect','common','메이플 탭','Maple Tap','가볍게 내려앉는 메이플 탭','placement',array['#d9a45d'],'tap',180,'maple'),
    ('place-walnut-shadow','placement_effect','placement_effect','common','월넛 섀도','Walnut Shadow','짧고 부드러운 월넛 그림자','placement',array['#765038'],'shadow',180,'walnut'),
    ('place-ivory-edge','placement_effect','placement_effect','common','아이보리 엣지','Ivory Edge','얇은 아이보리 테두리 점등','placement',array['#eadbbd'],'edge',180,'ivory'),
    ('place-charcoal-stamp','placement_effect','placement_effect','common','차콜 스탬프','Charcoal Stamp','단단하게 찍히는 차콜 스탬프','placement',array['#47433d'],'stamp',180,'charcoal'),
    ('place-moss-leaf','placement_effect','placement_effect','rare','모스 리프','Moss Leaf','작은 잎결이 퍼지는 배치 효과','placement',array['#7e9b63','#c7d59b'],'leaf',240,'forest'),
    ('place-coastal-ripple','placement_effect','placement_effect','rare','코스탈 리플','Coastal Ripple','한 겹 물결이 번지는 배치 효과','placement',array['#53b9b5','#8ed8d3'],'ripple',240,'coastal'),
    ('place-brass-ring','placement_effect','placement_effect','rare','브라스 링','Brass Ring','황동 고리가 짧게 확장되는 효과','placement',array['#d1a24f','#fff0b8'],'ring',240,'midnight'),
    ('place-moonlight-bloom','placement_effect','placement_effect','epic','문라이트 블룸','Moonlight Bloom','달빛 꽃잎이 피어나는 배치 효과','placement',array['#b8c6ed','#7f88c9'],'bloom',300,'moonlight'),
    ('place-ember-seal','placement_effect','placement_effect','epic','엠버 실','Ember Seal','불씨 문장이 새겨지는 배치 효과','placement',array['#f08b45','#c44631'],'seal',300,'ember'),
    ('place-prism-fold','placement_effect','placement_effect','epic','프리즘 폴드','Prism Fold','세 색 면이 접히며 모이는 효과','placement',array['#d85472','#52ad95','#5d72d8'],'fold',300,'prism'),
    ('place-cosmos-orbit','placement_effect','placement_effect','legendary','코스모스 오비트','Cosmos Orbit','작은 별빛 궤도가 타일을 감싸는 효과','placement',array['#8b7de4','#56d2ca'],'orbit',350,'cosmos'),
    ('place-tango-trinity','placement_effect','placement_effect','legendary','Tango 트리니티','Tango Trinity','세 Tango 빛이 순서대로 모이는 효과','placement',array['#d84d63','#36a173','#4d6ed7'],'trinity',350,'tango'),

    ('score-maple-fade','score_effect','score_effect','common','메이플 페이드','Maple Fade','따뜻하게 사라지는 기본 득점 효과','score',array['#d9a45d'],'fade',350,'maple'),
    ('score-walnut-sweep','score_effect','score_effect','common','월넛 스윕','Walnut Sweep','한 방향으로 정돈되는 득점 효과','score',array['#765038'],'sweep',350,'walnut'),
    ('score-ivory-lift','score_effect','score_effect','common','아이보리 리프트','Ivory Lift','밝게 떠오르며 사라지는 효과','score',array['#eadbbd'],'lift',350,'ivory'),
    ('score-charcoal-dust','score_effect','score_effect','common','차콜 더스트','Charcoal Dust','미세한 차콜 입자로 흩어지는 효과','score',array['#59544d'],'dust',350,'charcoal'),
    ('score-forest-scatter','score_effect','score_effect','rare','포레스트 스캐터','Forest Scatter','잎 조각이 바깥으로 흩어지는 효과','score',array['#7e9b63','#c7d59b'],'scatter',450,'forest'),
    ('score-coastal-wash','score_effect','score_effect','rare','코스탈 워시','Coastal Wash','물결이 타일을 씻어내는 효과','score',array['#53b9b5','#9be2db'],'wash',450,'coastal'),
    ('score-brass-glint','score_effect','score_effect','rare','브라스 글린트','Brass Glint','황동 빛이 선을 따라 훑는 효과','score',array['#d1a24f','#fff0b8'],'glint',450,'midnight'),
    ('score-moonlight-dissolve','score_effect','score_effect','epic','문라이트 디졸브','Moonlight Dissolve','달빛 입자로 녹아드는 득점 효과','score',array['#b8c6ed','#7885c6'],'dissolve',550,'moonlight'),
    ('score-ember-ash','score_effect','score_effect','epic','엠버 애시','Ember Ash','불씨와 재가 함께 날리는 효과','score',array['#f08b45','#7b3329'],'ash',550,'ember'),
    ('score-prism-ribbon','score_effect','score_effect','epic','프리즘 리본','Prism Ribbon','세 색 리본이 점수를 감싸는 효과','score',array['#d85472','#52ad95','#5d72d8'],'ribbon',550,'prism'),
    ('score-cosmos-fold','score_effect','score_effect','legendary','코스모스 폴드','Cosmos Fold','공간이 접히듯 별빛으로 사라지는 효과','score',array['#8b7de4','#56d2ca'],'cosmos-fold',650,'cosmos'),
    ('score-tango-flow','score_effect','score_effect','legendary','Tango 컬러 플로우','Tango Color Flow','세 컬러가 연결선을 따라 흐르는 효과','score',array['#d84d63','#36a173','#4d6ed7'],'tango-flow',650,'tango'),

    ('victory-maple-plaque','victory_effect','victory_effect','common','메이플 플라크','Maple Plaque','메이플 명패가 나타나는 승리 연출','victory',array['#d9a45d'],'plaque',1200,'maple'),
    ('victory-walnut-engraving','victory_effect','victory_effect','common','월넛 인그레이빙','Walnut Engraving','월넛 각인이 새겨지는 승리 연출','victory',array['#765038'],'engraving',1200,'walnut'),
    ('victory-ivory-ribbon','victory_effect','victory_effect','common','아이보리 리본','Ivory Ribbon','아이보리 리본이 펼쳐지는 승리 연출','victory',array['#eadbbd'],'ivory-ribbon',1200,'ivory'),
    ('victory-charcoal-seal','victory_effect','victory_effect','common','차콜 실','Charcoal Seal','차콜 인장이 찍히는 승리 연출','victory',array['#47433d'],'charcoal-seal',1200,'charcoal'),
    ('victory-forest-crown','victory_effect','victory_effect','rare','포레스트 크라운','Forest Crown','잎사귀 왕관이 완성되는 승리 연출','victory',array['#7e9b63','#c7d59b'],'forest-crown',1600,'forest'),
    ('victory-coastal-horizon','victory_effect','victory_effect','rare','코스탈 호라이즌','Coastal Horizon','수평선 빛이 펼쳐지는 승리 연출','victory',array['#53b9b5','#f3c879'],'horizon',1600,'coastal'),
    ('victory-midnight-trophy','victory_effect','victory_effect','rare','미드나이트 트로피','Midnight Trophy','황동 트로피가 빛나는 승리 연출','victory',array['#25262d','#d1a24f'],'trophy',1600,'midnight'),
    ('victory-moonlight-crest','victory_effect','victory_effect','epic','문라이트 크레스트','Moonlight Crest','달빛 문장이 떠오르는 승리 연출','victory',array['#b8c6ed','#7885c6'],'crest',2000,'moonlight'),
    ('victory-ember-master','victory_effect','victory_effect','epic','엠버 마스터','Ember Master','불씨 테두리가 완성되는 승리 연출','victory',array['#f08b45','#c44631'],'ember-master',2000,'ember'),
    ('victory-prism-gallery','victory_effect','victory_effect','epic','프리즘 갤러리','Prism Gallery','프리즘 패널이 전시되는 승리 연출','victory',array['#d85472','#52ad95','#5d72d8'],'gallery',2000,'prism'),
    ('victory-cosmos-tableau','victory_effect','victory_effect','legendary','코스모스 테이블로','Cosmos Tableau','별빛 장면이 완성되는 고유 승리 연출','victory',array['#8b7de4','#56d2ca'],'tableau',2500,'cosmos'),
    ('victory-tango-master-palette','victory_effect','victory_effect','legendary','Tango 마스터 팔레트','Tango Master Palette','Tango 세 컬러가 마스터 팔레트를 완성하는 연출','victory',array['#d84d63','#36a173','#4d6ed7'],'master-palette',2500,'tango')
)
insert into cosmetic_catalog (
  id, category, equip_slot, rarity, name_ko, name_en, localized_names, description_ko,
  chip_price, visual_kind, visual_config, representative_color, availability,
  available_in_weekly_store, available_in_boxes, active, collection_key, duration_ms
)
select
  id, category, equip_slot, rarity, name_ko, name_en,
  jsonb_build_object('ko', name_ko, 'en', name_en, 'ja', name_en, 'es', name_en, 'pt-BR', name_en),
  description_ko,
  case rarity when 'common' then 150 when 'rare' then 400 when 'epic' then 800 else 1600 end,
  visual_kind,
  jsonb_build_object('colors', to_jsonb(colors), 'preset', preset),
  colors[1], 'active', true, true, true, collection_key, duration_ms
from products
on conflict (id) do update set
  category = excluded.category,
  equip_slot = excluded.equip_slot,
  rarity = excluded.rarity,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  localized_names = excluded.localized_names,
  description_ko = excluded.description_ko,
  chip_price = excluded.chip_price,
  visual_kind = excluded.visual_kind,
  visual_config = excluded.visual_config,
  representative_color = excluded.representative_color,
  availability = excluded.availability,
  available_in_weekly_store = excluded.available_in_weekly_store,
  available_in_boxes = excluded.available_in_boxes,
  active = excluded.active,
  collection_key = excluded.collection_key,
  duration_ms = excluded.duration_ms;

create index if not exists cosmetic_catalog_collection_idx on cosmetic_catalog(collection_key, category);
create index if not exists cosmetic_craft_history_account_idx on cosmetic_craft_history(account_id, created_at desc);
