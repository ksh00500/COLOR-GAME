-- Victory effects are being redesigned. Keep ownership and acquisition history
-- intact so retired items can be exchanged for their future replacements.
delete from weekly_store_items
where cosmetic_id in (
  select id from cosmetic_catalog where category = 'victory_effect'
);

update account_loadouts
set victory_effect_id = null,
    updated_at = now()
where victory_effect_id is not null;

update cosmetic_catalog
set active = false,
    available_in_weekly_store = false,
    available_in_boxes = false
where category = 'victory_effect';
