-- Harden privileged role lookup, profile privacy and question-bank writes.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when p.role = 'mezzo_staff' and p.approval_status <> 'approved' then 'pending_staff'
        else p.role
      end
      from public.profiles p
      where p.id = (select auth.uid())
    ),
    'anonymous'
  )
$$;

revoke all on function private.current_profile_role() from public, anon;
grant execute on function private.current_profile_role() to authenticated;

-- Keep the existing policy API stable, but make the public wrapper an
-- unprivileged invoker rather than a publicly exposed SECURITY DEFINER.
create or replace function public.current_profile_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.current_profile_role()
$$;

revoke all on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated;

-- A learner may read only their own profile. Administrators and approved
-- Mezzo Staff may read profiles for administration and support.
drop policy if exists "Profiles readable by authenticated" on public.profiles;
create policy "Profiles readable by owner or approved staff"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select public.current_profile_role()) in ('admin', 'mezzo_staff')
  );

revoke select on public.profiles from public, anon;
grant select on public.profiles to authenticated;

-- Remove temporary workbook MVP policies that allowed public writes.
drop policy if exists "MVP anon can insert workbook questions" on public.question_bank;
drop policy if exists "MVP anon can update questions" on public.question_bank;
drop policy if exists "MVP anon can delete questions" on public.question_bank;

revoke insert, update, delete on public.question_bank from public, anon;
grant select on public.question_bank to anon, authenticated;
grant insert, update, delete on public.question_bank to authenticated;

-- Remove the duplicate privileged management policy while retaining the
-- canonical teacher/admin policy.
drop policy if exists "Admins manage questions" on public.question_bank;
