-- Full-scale live launch support: Supabase Auth profiles, score records, progress snapshots and safer roles.
-- Run after the earlier migrations in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists updated_at timestamptz default now();

alter table public.profiles
  drop constraint if exists profiles_class_level_check;

alter table public.profiles
  add constraint profiles_class_level_check
  check (class_level in ('KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','JHS 1','JHS 2','JHS 3','Basic 7','Basic 8','Basic 9','SHS 1','SHS 2','SHS 3'));

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','teacher','mezzo_staff','admin'));

alter table public.question_bank
  add column if not exists topic_area text,
  add column if not exists topic_sublevel text,
  add column if not exists numeric_answer numeric,
  add column if not exists ai_generated boolean default false,
  add column if not exists source_type text,
  add column if not exists source_name text,
  add column if not exists source_page text,
  add column if not exists question_image_url text,
  add column if not exists option_a_image_url text,
  add column if not exists option_b_image_url text,
  add column if not exists option_c_image_url text,
  add column if not exists option_d_image_url text;

alter table public.question_bank
  drop constraint if exists question_bank_class_level_check;

alter table public.question_bank
  add constraint question_bank_class_level_check
  check (class_level in ('KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','JHS 1','JHS 2','JHS 3','Basic 7','Basic 8','Basic 9','SHS 1','SHS 2','SHS 3'));

create table if not exists public.game_score_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  student_name text,
  school_name text,
  class_level text,
  curriculum text default 'GES',
  mode text not null,
  topic text,
  topic_area text,
  score integer default 0,
  total integer,
  percent numeric(5,2),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.user_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  snapshot_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  unique(user_id, snapshot_key)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

create index if not exists game_score_records_user_idx on public.game_score_records(user_id, created_at desc);
create index if not exists game_score_records_mode_idx on public.game_score_records(mode, class_level, topic, created_at desc);
create index if not exists user_progress_snapshots_user_idx on public.user_progress_snapshots(user_id, updated_at desc);

alter table public.game_score_records enable row level security;
alter table public.user_progress_snapshots enable row level security;
alter table public.app_settings enable row level security;

-- Profiles: users manage own profile, admins can read/manage profiles for operations.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Profiles readable by owner or admin" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own or admin" on public.profiles;

create policy "Profiles readable by owner or admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Profiles insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Profiles update own or admin"
  on public.profiles for update
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Score records: learners insert/read own; admins/teachers read for reports.
drop policy if exists "Users insert own score records" on public.game_score_records;
drop policy if exists "Users read own score records" on public.game_score_records;
drop policy if exists "Teachers and admins read score records" on public.game_score_records;

create policy "Users insert own score records"
  on public.game_score_records for insert
  with check (auth.uid() = user_id);

create policy "Users read own score records"
  on public.game_score_records for select
  using (auth.uid() = user_id);

create policy "Teachers and admins read score records"
  on public.game_score_records for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','mezzo_staff')));

-- Progress snapshots: exact local progress is synced to cloud per user.
drop policy if exists "Users manage own progress snapshots" on public.user_progress_snapshots;
drop policy if exists "Teachers and admins read progress snapshots" on public.user_progress_snapshots;

create policy "Users manage own progress snapshots"
  on public.user_progress_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Teachers and admins read progress snapshots"
  on public.user_progress_snapshots for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','mezzo_staff')));

-- App settings: public read, admin writes.
drop policy if exists "App settings readable" on public.app_settings;
drop policy if exists "Admins manage app settings" on public.app_settings;

create policy "App settings readable" on public.app_settings for select using (true);
create policy "Admins manage app settings" on public.app_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Question bank: keep readable; admins/teachers manage through the live admin panels.
drop policy if exists "Teachers and admins manage questions" on public.question_bank;
create policy "Teachers and admins manage questions"
  on public.question_bank for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
