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
      updated_at = now()
  where users.email = lower(trim(target_email))
  returning users.id, users.username, users.email, users.failed_login_attempts, users.locked_until;
$$;

revoke all on function public.unlock_user_account(text) from public, anon, authenticated;
grant execute on function public.unlock_user_account(text) to service_role;
