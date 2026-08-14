-- Placement effect visual rework. Product IDs, ownership and prices stay unchanged.
-- Rarity is intentionally rebalanced without replacing existing catalog rows.
WITH effect_updates(id, preset, rarity, duration_ms, name_ko, name_en, name_ja, name_es, name_pt, description_ko) AS (
  VALUES
    ('place-maple-tap', 'tap', 'common', 320, '메이플 탭', 'Maple Tap', 'メイプルタップ', 'Toque de Arce', 'Toque de Bordo', '타일이 살짝 높게 내려와 표면이 짧게 눌린 뒤 고정됩니다.'),
    ('place-walnut-shadow', 'shadow', 'common', 380, '월넛 섀도', 'Walnut Shadow', 'ウォルナットシャドウ', 'Sombra de Nogal', 'Sombra de Nogueira', '접촉 그림자가 착지에 맞춰 작고 진하게 모입니다.'),
    ('place-ivory-edge', 'ivory-click', 'common', 420, '아이보리 클릭', 'Ivory Click', 'アイボリークリック', 'Clic Marfil', 'Clique Marfim', '아이보리 모서리 캡 네 개가 맞물리며 타일을 고정합니다.'),
    ('place-charcoal-stamp', 'stamp', 'rare', 560, '차콜 스탬프', 'Charcoal Stamp', 'チャコールスタンプ', 'Sello de Carbón', 'Selo de Carvão', '실제 Tango 마크의 윤곽선만 인장처럼 찍힙니다.'),
    ('place-moss-leaf', 'leaf', 'rare', 640, '모스 그레인', 'Moss Grain', 'モスグレイン', 'Veta de Musgo', 'Veio de Musgo', '이끼빛 음영이 타일 표면 안쪽을 부드럽게 스쳐 재질의 깊이를 더합니다.'),
    ('place-coastal-ripple', 'ripple', 'common', 500, '코스탈 리플', 'Coastal Ripple', 'コースタルリップル', 'Ondulación Costera', 'Onda Costeira', '타일 표면이 3D 수면처럼 한 차례 흔들려 안정됩니다.'),
    ('place-brass-ring', 'ring', 'epic', 780, '브라스 링', 'Brass Ring', 'ブラスリング', 'Anillo de Latón', 'Anel de Latão', '세 축의 황동 궤도가 원자 구조처럼 회전한 뒤 중심핵에 잠깁니다.'),
    ('place-moonlight-bloom', 'bloom', 'epic', 760, '문라이트 블룸', 'Moonlight Bloom', 'ムーンライトブルーム', 'Flor Lunar', 'Flor do Luar', '달빛 중심에서 여덟 장의 꽃잎이 사방으로 피어납니다.'),
    ('place-ember-seal', 'seal', 'epic', 780, '엠버 실', 'Ember Seal', 'エンバーシール', 'Sello de Brasa', 'Selo de Brasa', '작은 3D 불티가 깊이를 달리하며 짧게 튀어 오릅니다.'),
    ('place-prism-fold', 'fold', 'epic', 860, '프리즘 애퍼처', 'Prism Aperture', 'プリズムアパーチャ', 'Apertura Prisma', 'Abertura Prismática', '다층 유리 면이 접혀 중심 프리즘을 만들고 굴절광을 통과시킵니다.'),
    ('place-cosmos-orbit', 'orbit', 'legendary', 720, '코스모스 오비트', 'Cosmos Orbit', 'コスモスオービット', 'Órbita Cosmos', 'Órbita Cosmos', '별빛 궤도와 입자가 타일 중심을 감싸며 안착합니다.'),
    ('place-tango-trinity', 'trinity', 'legendary', 900, 'Tango 트리니티', 'Tango Trinity', 'Tango トリニティ', 'Trinidad Tango', 'Trindade Tango', '세 색 조각이 궤도를 돌아 Tango 마크로 결속되고 금빛 파장이 남습니다.')
)
UPDATE cosmetic_catalog AS catalog
SET
  name_ko = updates.name_ko,
  name_en = updates.name_en,
  rarity = updates.rarity,
  localized_names = jsonb_build_object(
    'ko', updates.name_ko,
    'en', updates.name_en,
    'ja', updates.name_ja,
    'es', updates.name_es,
    'pt-BR', updates.name_pt
  ),
  description_ko = updates.description_ko,
  duration_ms = updates.duration_ms,
  visual_config = jsonb_set(
    jsonb_set(catalog.visual_config, '{preset}', to_jsonb(updates.preset::text), true),
    '{visualConfig}',
    COALESCE(catalog.visual_config->'visualConfig', '{}'::jsonb) || jsonb_build_object(
      'kind', 'placement',
      'sequence', updates.preset,
      'durationMs', updates.duration_ms
    ),
    true
  )
FROM effect_updates AS updates
WHERE catalog.id = updates.id;
