alter table accounts
  add column if not exists attendance_streak integer not null default 0,
  add column if not exists longest_attendance_streak integer not null default 0,
  add column if not exists last_attendance_date date;

create table if not exists attendance_days (
  account_id text not null references accounts(id) on delete cascade,
  attended_on date not null,
  created_at timestamptz not null default now(),
  primary key (account_id, attended_on)
);

create index if not exists attendance_days_account_idx
  on attendance_days(account_id, attended_on desc);
