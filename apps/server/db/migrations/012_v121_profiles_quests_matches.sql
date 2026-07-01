alter table accounts
  add column if not exists casual_wins integer not null default 0,
  add column if not exists casual_losses integer not null default 0,
  add column if not exists casual_draws integer not null default 0,
  add column if not exists display_name_changed_at timestamptz;

alter table match_results
  add column if not exists winner_player_slot smallint
    check (winner_player_slot in (1, 2));

update match_results
set winner_player_slot = case
  when result = 'draw' then null
  when winner_account_id is not null and winner_account_id = player_one_account_id then 1
  when winner_account_id is not null and winner_account_id = player_two_account_id then 2
  when winner_account_id is null and player_one_account_id is null and player_two_account_id is not null then 1
  when winner_account_id is null and player_two_account_id is null and player_one_account_id is not null then 2
  else winner_player_slot
end
where winner_player_slot is null;

update accounts a
set
  games_played = stats.games_played,
  ranked_wins = stats.ranked_wins,
  ranked_losses = stats.ranked_losses,
  ranked_draws = stats.ranked_draws,
  casual_wins = stats.casual_wins,
  casual_losses = stats.casual_losses,
  casual_draws = stats.casual_draws,
  updated_at = now()
from (
  select
    a2.id,
    count(m.game_id)::integer as games_played,
    count(*) filter (
      where m.mode = 'ranked' and (
        (m.player_one_account_id = a2.id and m.winner_player_slot = 1)
        or (m.player_two_account_id = a2.id and m.winner_player_slot = 2)
      )
    )::integer as ranked_wins,
    count(*) filter (
      where m.mode = 'ranked' and m.result <> 'draw' and m.winner_player_slot is not null and not (
        (m.player_one_account_id = a2.id and m.winner_player_slot = 1)
        or (m.player_two_account_id = a2.id and m.winner_player_slot = 2)
      )
    )::integer as ranked_losses,
    count(*) filter (
      where m.mode = 'ranked' and (m.result = 'draw' or m.winner_player_slot is null)
    )::integer as ranked_draws,
    count(*) filter (
      where m.mode = 'casual' and (
        (m.player_one_account_id = a2.id and m.winner_player_slot = 1)
        or (m.player_two_account_id = a2.id and m.winner_player_slot = 2)
      )
    )::integer as casual_wins,
    count(*) filter (
      where m.mode = 'casual' and m.result <> 'draw' and m.winner_player_slot is not null and not (
        (m.player_one_account_id = a2.id and m.winner_player_slot = 1)
        or (m.player_two_account_id = a2.id and m.winner_player_slot = 2)
      )
    )::integer as casual_losses,
    count(*) filter (
      where m.mode = 'casual' and (m.result = 'draw' or m.winner_player_slot is null)
    )::integer as casual_draws
  from accounts a2
  left join match_results m
    on m.player_one_account_id = a2.id or m.player_two_account_id = a2.id
  group by a2.id
) stats
where a.id = stats.id;

alter table economy_quest_unlocks
  add column if not exists reward_box_tickets integer not null default 0;

alter table economy_quest_unlocks
  alter column reward_chips set default 0;

alter table economy_quest_unlocks
  drop constraint if exists economy_quest_unlocks_reward_chips_check,
  drop constraint if exists economy_quest_unlocks_quest_key_check;

alter table economy_quest_unlocks
  add constraint economy_quest_unlocks_reward_check
    check (reward_chips >= 0 and reward_box_tickets >= 0 and reward_chips + reward_box_tickets > 0),
  add constraint economy_quest_unlocks_quest_key_check
    check (quest_key in (
      'welcome',
      'attendance',
      'attendance_streak',
      'first_online_win',
      'daily_complete',
      'weekly_attendance',
      'weekly_matches',
      'weekly_wins',
      'weekly_complete'
    ));

update cosmetic_catalog
set chip_price = case rarity
  when 'common' then 300
  when 'rare' then 600
  when 'epic' then 1500
  when 'legendary' then 5000
  else chip_price
end
where category = 'tile_color'
  and availability = 'active';
