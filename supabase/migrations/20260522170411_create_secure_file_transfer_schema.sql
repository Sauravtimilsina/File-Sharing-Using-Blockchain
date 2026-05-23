create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  username text not null unique,
  email text not null unique,
  password text not null,
  is_verified boolean not null default false,
  failed_login_attempts integer not null default 0 check (failed_login_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.otps (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  purpose text not null default 'email_verification',
  otp text,
  otp_hash text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists otps_email_created_at_idx
  on public.otps (email, created_at desc);

create index if not exists otps_email_purpose_created_at_idx
  on public.otps (email, purpose, created_at desc);

create table if not exists public.files (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.users(id) on delete cascade,
  filename text not null,
  stored_name text not null unique,
  hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_owner_created_at_idx
  on public.files (owner_id, created_at desc);

create table if not exists public.shares (
  id text primary key default gen_random_uuid()::text,
  file_id text not null references public.files(id) on delete cascade,
  owner_id text not null references public.users(id) on delete cascade,
  shared_with_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shares_file_recipient_unique unique (file_id, shared_with_id),
  constraint shares_not_self check (owner_id <> shared_with_id)
);

create index if not exists shares_recipient_created_at_idx
  on public.shares (shared_with_id, created_at desc);

create table if not exists public.blocks (
  id text primary key default gen_random_uuid()::text,
  block_index bigint not null unique,
  file_id text not null unique references public.files(id) on delete cascade,
  file_hash text not null,
  previous_hash text not null,
  timestamp timestamptz not null default now()
);

create table if not exists public.login_audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete set null,
  identifier text not null,
  event_type text not null check (event_type in ('success', 'failure', 'locked')),
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists login_audit_logs_created_at_idx
  on public.login_audit_logs (created_at desc);

create table if not exists public.activity_audit_logs (
  id text primary key default gen_random_uuid()::text,
  actor_id text references public.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists activity_audit_logs_actor_created_at_idx
  on public.activity_audit_logs (actor_id, created_at desc);

alter table public.users enable row level security;
alter table public.otps enable row level security;
alter table public.files enable row level security;
alter table public.shares enable row level security;
alter table public.blocks enable row level security;
alter table public.login_audit_logs enable row level security;
alter table public.activity_audit_logs enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.otps from anon, authenticated;
revoke all on table public.files from anon, authenticated;
revoke all on table public.shares from anon, authenticated;
revoke all on table public.blocks from anon, authenticated;
revoke all on table public.login_audit_logs from anon, authenticated;
revoke all on table public.activity_audit_logs from anon, authenticated;

grant all on table public.users to service_role;
grant all on table public.otps to service_role;
grant all on table public.files to service_role;
grant all on table public.shares to service_role;
grant all on table public.blocks to service_role;
grant all on table public.login_audit_logs to service_role;
grant all on table public.activity_audit_logs to service_role;
