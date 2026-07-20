-- Rich cosmetic render metadata. Existing ids, ownership, prices and legacy
-- visual keys remain unchanged for installed app versions.
update cosmetic_catalog
set visual_config = visual_config || jsonb_build_object(
  'visualConfig',
  case category
    when 'board_theme' then jsonb_build_object(
      'kind', 'board',
      'surface', visual_config->>'preset',
      'frame', case rarity when 'common' then 'crafted' when 'rare' then 'inlaid' when 'epic' then 'layered' else 'signature' end,
      'cellStyle', case rarity when 'common' then 'carved' when 'rare' then 'rimmed' when 'epic' then 'luminous' else 'jewel' end,
      'detailLevel', case rarity when 'common' then 1 when 'rare' then 2 when 'epic' then 3 else 4 end,
      'lighting', case rarity when 'common' then 'soft' when 'rare' then 'accent' when 'epic' then 'cinematic' else 'signature' end
    )
    when 'placement_effect' then jsonb_build_object(
      'kind', 'placement',
      'sequence', visual_config->>'preset',
      'layers', case rarity when 'common' then 2 when 'rare' then 3 else 4 end,
      'particles', case rarity when 'common' then 4 when 'rare' then 7 when 'epic' then 10 else 12 end,
      'durationMs', duration_ms
    )
    when 'score_effect' then jsonb_build_object(
      'kind', 'score',
      'sequence', visual_config->>'preset',
      'layers', case rarity when 'common' then 2 when 'rare' then 3 else 4 end,
      'particles', case rarity when 'common' then 5 when 'rare' then 8 when 'epic' then 12 else 14 end,
      'durationMs', duration_ms
    )
    when 'victory_effect' then jsonb_build_object(
      'kind', 'victory',
      'scene', visual_config->>'preset',
      'layers', case rarity when 'common' then 2 when 'rare' then 3 else 4 end,
      'durationMs', duration_ms
    )
    else coalesce(visual_config->'visualConfig', '{}'::jsonb)
  end
)
where category in ('board_theme', 'placement_effect', 'score_effect', 'victory_effect');
