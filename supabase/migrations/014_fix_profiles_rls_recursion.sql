-- Fix infinite recursion in profiles RLS policies.
-- Run this after 013_full_scale_live_auth_scores.sql.

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anonymous')
$$;

grant execute on function public.current_profile_role() to anon, authenticated;

alter table public.profiles enable row level security;

-- Remove policies that query profiles from inside profiles without a security-definer helper.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Profiles readable by owner or admin" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own or admin" on public.profiles;
drop policy if exists "Profiles readable by authenticated" on public.profiles;
drop policy if exists "Profiles update own or admin via helper" on public.profiles;

-- Safer live-launch profile policies.
-- Authenticated users can read profiles needed for admin/teacher dashboards and role checks.
create policy "Profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Profiles insert own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Profiles update own or admin via helper"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.current_profile_role() = 'admin')
  with check (auth.uid() = id or public.current_profile_role() = 'admin');

-- Recreate dependent policies using the helper to avoid recursive policy evaluation.
drop policy if exists "Teachers and admins read score records" on public.game_score_records;
create policy "Teachers and admins read score records"
  on public.game_score_records for select
  to authenticated
  using (public.current_profile_role() in ('admin','teacher','mezzo_staff'));

drop policy if exists "Teachers and admins read progress snapshots" on public.user_progress_snapshots;
create policy "Teachers and admins read progress snapshots"
  on public.user_progress_snapshots for select
  to authenticated
  using (public.current_profile_role() in ('admin','teacher','mezzo_staff'));

drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Admins manage app settings"
  on public.app_settings for all
  to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "Teachers and admins manage questions" on public.question_bank;
create policy "Teachers and admins manage questions"
  on public.question_bank for all
  to authenticated
  using (public.current_profile_role() in ('admin','teacher'))
  with check (public.current_profile_role() in ('admin','teacher'));

-- Some earlier migrations used this policy name. Replace it too if it exists.
drop policy if exists "Admins manage questions" on public.question_bank;
create policy "Admins manage questions"
  on public.question_bank for all
  to authenticated
  using (public.current_profile_role() in ('admin','teacher'))
  with check (public.current_profile_role() in ('admin','teacher'));
