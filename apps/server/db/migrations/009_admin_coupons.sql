alter table accounts
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create table if not exists admin_accounts (
  id text primary key,
  email text not null unique,
  display_name text not null default 'Tango Admin',
  password_hash text not null,
  active boolean not null default true,
  active_session_id text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coupons (
  id text primary key,
  code text not null unique,
  name text not null,
  description text not null default '',
  rewards jsonb not null,
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  active boolean not null default true,
  deleted_at timestamptz,
  created_by text references admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(rewards) = 'array'),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists coupon_redemptions (
  id text primary key,
  coupon_id text not null references coupons(id),
  account_id text not null references accounts(id) on delete cascade,
  reward_result jsonb not null,
  redeemed_at timestamptz not null default now(),
  unique (coupon_id, account_id)
);

create index if not exists coupon_redemptions_coupon_idx
  on coupon_redemptions (coupon_id, redeemed_at desc);
create index if not exists coupon_redemptions_account_idx
  on coupon_redemptions (account_id, redeemed_at desc);

create table if not exists account_palette_box_tickets (
  account_id text primary key references accounts(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

alter table cosmetic_box_openings
  add column if not exists payment_method text not null default 'chips';

alter table cosmetic_box_openings
  drop constraint if exists cosmetic_box_openings_payment_method_check;
alter table cosmetic_box_openings
  add constraint cosmetic_box_openings_payment_method_check
  check (payment_method in ('chips', 'ticket'));

create table if not exists admin_audit_logs (
  id bigserial primary key,
  admin_id text references admin_accounts(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on admin_audit_logs (created_at desc);

