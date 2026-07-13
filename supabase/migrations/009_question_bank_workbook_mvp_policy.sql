-- Fix for workbook bulk sync error:
-- "new row violates row-level security policy for table question_bank"
--
-- Why this is needed:
-- The current web app uses a local/demo admin login, not Supabase Auth.
-- Supabase therefore receives the insert request through the anon key with auth.uid() = null.
-- Existing RLS only allows a real authenticated Supabase admin profile to insert questions.
--
-- MVP effect:
-- Allows the app's Admin page to sync locally generated/imported workbook questions into question_bank.
-- For a locked production release, replace this with real Supabase Auth + admin role or a server-side
-- service-role import endpoint.

alter table public.question_bank enable row level security;

-- Keep active questions readable.
drop policy if exists "Active questions are readable" on public.question_bank;
create policy "Active questions are readable"
  on public.question_bank
  for select
  using (is_active = true);

-- Keep authenticated Supabase-admin management when real Supabase Auth is later enabled.
drop policy if exists "Admins manage questions" on public.question_bank;
create policy "Admins manage questions"
  on public.question_bank
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  );

-- Temporary MVP policy for the current demo/local admin sync button.
-- This is what fixes the 1,312 workbook question sync failure.
drop policy if exists "MVP anon can insert workbook questions" on public.question_bank;
create policy "MVP anon can insert workbook questions"
  on public.question_bank
  for insert
  to anon, authenticated
  with check (true);

-- Optional MVP update/delete support for the Admin question editor while real Supabase Auth is not yet wired.
drop policy if exists "MVP anon can update questions" on public.question_bank;
create policy "MVP anon can update questions"
  on public.question_bank
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "MVP anon can delete questions" on public.question_bank;
create policy "MVP anon can delete questions"
  on public.question_bank
  for delete
  to anon, authenticated
  using (true);

-- Make class-level constraints compatible with KG1, KG2, Grade 7, Grade 8 and Grade 9 workbook imports.
alter table public.question_bank
  drop constraint if exists question_bank_class_level_check;

alter table public.question_bank
  add constraint question_bank_class_level_check
  check (class_level in ('KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3'));

alter table public.profiles
  drop constraint if exists profiles_class_level_check;

alter table public.profiles
  add constraint profiles_class_level_check
  check (class_level in ('KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3'));

-- Allow teacher and Mezzo Staff profile roles if the production profile table is used later.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','teacher','mezzo_staff','admin'));
