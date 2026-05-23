alter table public.users
  add column if not exists full_name text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists department text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists avatar_data_url text,
  add column if not exists daily_lock_count integer not null default 0 check (daily_lock_count >= 0),
  add column if not exists lock_count_date date;

create or replace function public.unlock_user_account(target_email text)
returns table (
  id text,
  username text,
  email text,
  failed_login_attempts integer,
  locked_until timestamptz
)
language sql
security definer
set search_path = public
as $$
  update public.users
  set failed_login_attempts = 0,
      locked_until = null,
      daily_lock_count = 0,
      lock_count_date = null,
      updated_at = now()
  where users.email = lower(trim(target_email))
  returning users.id, users.username, users.email, users.failed_login_attempts, users.locked_until;
$$;

revoke all on function public.unlock_user_account(text) from public, anon, authenticated;
grant execute on function public.unlock_user_account(text) to service_role;
