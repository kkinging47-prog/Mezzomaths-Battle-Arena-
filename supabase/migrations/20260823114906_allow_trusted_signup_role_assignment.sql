create or replace function public.protect_profile_role_and_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  actor_role text := public.current_profile_role();
begin
  if tg_op = 'INSERT' then
    new.role := 'student';
    new.approval_status := 'approved';
    new.approved_at := null;
    new.approved_by := null;
  elsif jwt_role = 'service_role' then
    -- The trusted account-creation API may assign only public signup roles.
    new.role := case
      when new.role in ('student', 'teacher', 'mezzo_staff') then new.role
      else old.role
    end;
    new.approval_status := case when new.role = 'mezzo_staff' then 'pending' else 'approved' end;
    new.approved_at := null;
    new.approved_by := null;
  elsif actor_role <> 'admin' then
    -- Ordinary users may edit profile details but cannot promote themselves.
    new.role := old.role;
    new.approval_status := old.approval_status;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role_and_approval() from public, anon, authenticated;
