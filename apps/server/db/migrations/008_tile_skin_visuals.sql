update cosmetic_catalog
set visual_config = visual_config || '{"splitAngle":180}'::jsonb
where id in ('tile-sunset', 'tile-forest-lake', 'tile-twilight');

update cosmetic_catalog
set visual_config = visual_config || '{"splitAngle":90}'::jsonb
where id in ('tile-berry', 'tile-fire-ice');

update cosmetic_catalog
set visual_config = visual_config || '{"splitAngle":135}'::jsonb
where id in ('tile-citrus', 'tile-orchid', 'tile-gold-navy');

update cosmetic_catalog
set visual_config = visual_config || '{"splitAngle":45}'::jsonb
where id = 'tile-lagoon';

update cosmetic_catalog
set
  name_ko = '조커',
  name_en = 'Joker',
  localized_names = jsonb_build_object(
    'ko', '조커',
    'en', 'Joker',
    'ja', 'Joker',
    'es', 'Joker',
    'pt-BR', 'Joker'
  ),
  description_ko = '보라와 초록이 좌우로 나뉜 장난스러운 타일',
  visual_config = '{"colors":["#7d3e91","#31a56f"],"splitAngle":90}'::jsonb,
  representative_color = '#577250'
where id = 'tile-mono';
