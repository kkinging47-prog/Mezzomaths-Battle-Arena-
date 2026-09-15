-- Convert the login touch helper to security invoker. It only updates the caller's own profile through RLS.
-- Run after migration 020.

create or replace function public.touch_current_user_login()
returns public.profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.profiles;
begin
  update public.profiles
  set last_login_at = now(),
      login_count = coalesce(login_count, 0) + 1,
      updated_at = now()
  where id = auth.uid()
  returning * into row;

  return row;
end;
$$;

revoke execute on function public.touch_current_user_login() from public, anon;
grant execute on function public.touch_current_user_login() to authenticated;
