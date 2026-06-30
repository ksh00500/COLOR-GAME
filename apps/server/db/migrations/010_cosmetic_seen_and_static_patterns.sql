alter table account_cosmetics
  add column if not exists first_equipped_at timestamptz;

update account_cosmetics ac
set first_equipped_at = coalesce(ac.first_equipped_at, ac.acquired_at)
from account_loadouts al
where al.account_id = ac.account_id
  and ac.cosmetic_id in (
    al.tile_color_a_id,
    al.tile_color_b_id,
    al.tile_color_c_id,
    al.placement_effect_id,
    al.score_effect_id,
    al.victory_effect_id,
    al.profile_frame_id,
    al.profile_badge_id,
    al.profile_title_id
  );

update cosmetic_catalog
set description_ko = 'Tango의 세 빛이 정적으로 겹쳐진 리본 문양'
where id = 'tile-tango-spectrum';
