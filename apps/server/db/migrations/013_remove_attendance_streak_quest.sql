delete from economy_quest_unlocks
where quest_key = 'attendance_streak';

alter table economy_quest_unlocks
  drop constraint if exists economy_quest_unlocks_quest_key_check;

alter table economy_quest_unlocks
  add constraint economy_quest_unlocks_quest_key_check
    check (quest_key in (
      'welcome',
      'attendance',
      'first_online_win',
      'daily_complete',
      'weekly_attendance',
      'weekly_matches',
      'weekly_wins',
      'weekly_complete'
    ));
