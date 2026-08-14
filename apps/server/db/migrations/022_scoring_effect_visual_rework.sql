-- Scoring effect visual rework. Product IDs, rarity, ownership and prices stay unchanged.
WITH effect_updates(id, preset, duration_ms, name_ko, name_en, name_ja, name_es, name_pt, description_ko) AS (
  VALUES
    ('score-maple-fade', 'fade', 460, '메이플 페이드', 'Maple Fade', 'メイプルフェード', 'Desvanecer de Arce', 'Desvanecer de Bordo', '따뜻한 나뭇결이 연결된 타일을 안쪽으로 가라앉혀 정리합니다.'),
    ('score-walnut-sweep', 'sweep', 520, '월넛 스윕', 'Walnut Sweep', 'ウォルナットスイープ', 'Barrido de Nogal', 'Varredura de Nogueira', '월넛 스캔이 연결의 시작부터 끝까지 한 번에 훑습니다.'),
    ('score-ivory-lift', 'lift', 520, '아이보리 리프트', 'Ivory Lift', 'アイボリーリフト', 'Elevación Marfil', 'Elevação Marfim', '아이보리 하부광이 순서대로 타일을 들어 올려 정리합니다.'),
    ('score-charcoal-dust', 'dust', 580, '차콜 더스트', 'Charcoal Dust', 'チャコールダスト', 'Polvo de Carbón', 'Pó de Carvão', '연결된 타일의 실루엣이 절제된 차콜 입자로 부서집니다.'),
    ('score-forest-scatter', 'scatter', 640, '포레스트 스캐터', 'Forest Scatter', 'フォレストスキャター', 'Dispersión Forestal', 'Dispersão Florestal', '연결선을 따라 자란 잎맥이 타일 가장자리로 흩어집니다.'),
    ('score-coastal-wash', 'wash', 680, '코스탈 워시', 'Coastal Wash', 'コースタルウォッシュ', 'Oleada Costera', 'Onda Costeira', '넓은 물결과 굴절광이 연결된 타일을 차례로 통과합니다.'),
    ('score-brass-glint', 'glint', 640, '브라스 글린트', 'Brass Glint', 'ブラスグリント', 'Destello de Latón', 'Brilho de Latão', '황동 연결선 위로 연마된 빛과 작은 접점이 이동합니다.'),
    ('score-moonlight-dissolve', 'dissolve', 760, '문라이트 디졸브', 'Moonlight Dissolve', 'ムーンライトディゾルブ', 'Disolución Lunar', 'Dissolução Lunar', '달빛 후광이 타일을 감싼 뒤 별가루가 위로 흩어집니다.'),
    ('score-ember-ash', 'ash', 780, '엠버 애시', 'Ember Ash', 'エンバーアッシュ', 'Ceniza de Brasa', 'Cinza de Brasa', '가느다란 균열이 빛난 뒤 작은 불씨와 재가 떠오릅니다.'),
    ('score-prism-ribbon', 'ribbon', 800, '프리즘 리본', 'Prism Ribbon', 'プリズムリボン', 'Cinta Prisma', 'Fita Prisma', '세 투명 리본이 연결선을 따라 엮여 하나의 빛으로 모입니다.'),
    ('score-cosmos-fold', 'cosmos-fold', 860, '코스모스 폴드', 'Cosmos Fold', 'コスモスフォールド', 'Pliegue Cosmos', 'Dobra Cosmos', '별자리 연결이 중심으로 접히며 깊은 우주광을 남깁니다.'),
    ('score-tango-flow', 'tango-flow', 860, 'Tango 컬러 플로우', 'Tango Color Flow', 'Tango カラーフロー', 'Flujo de Color Tango', 'Fluxo de Cores Tango', '세 색의 흐름이 합쳐져 Tango 마크를 완성하고 짧게 맥동합니다.')
)
UPDATE cosmetic_catalog AS catalog
SET
  name_ko = updates.name_ko,
  name_en = updates.name_en,
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
      'kind', 'score',
      'sequence', updates.preset,
      'durationMs', updates.duration_ms
    ),
    true
  )
FROM effect_updates AS updates
WHERE catalog.id = updates.id;
