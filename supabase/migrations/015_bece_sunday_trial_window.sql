-- Sunday BECE Trial Window
-- Free weekly Sunday evening BECE objective trial for Grade 9 / JHS 3 / Basic 9 candidates.

create extension if not exists pgcrypto;

create table if not exists public.bece_sunday_trial_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact text not null,
  school_name text not null,
  location text not null,
  region text not null,
  class_level text default 'Grade 9',
  created_at timestamptz default now()
);

create table if not exists public.bece_sunday_trial_attempts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  full_name text not null,
  contact text,
  school_name text,
  location text,
  region text,
  score integer not null default 0,
  total integer not null default 40,
  percent numeric(5,2),
  time_taken_seconds integer,
  answers jsonb default '[]'::jsonb,
  ai_analysis jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists bece_sunday_trial_attempts_week_rank_idx
  on public.bece_sunday_trial_attempts(week_start, score desc, time_taken_seconds asc, created_at asc);

create index if not exists bece_sunday_trial_registrations_contact_idx
  on public.bece_sunday_trial_registrations(contact);

alter table public.bece_sunday_trial_registrations enable row level security;
alter table public.bece_sunday_trial_attempts enable row level security;

drop policy if exists "Public register Sunday BECE candidates" on public.bece_sunday_trial_registrations;
create policy "Public register Sunday BECE candidates"
  on public.bece_sunday_trial_registrations for insert
  with check (true);

drop policy if exists "Admins read Sunday BECE candidates" on public.bece_sunday_trial_registrations;
create policy "Admins read Sunday BECE candidates"
  on public.bece_sunday_trial_registrations for select
  using (
    auth.uid() is null
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','mezzo_staff'))
  );

drop policy if exists "Public insert Sunday BECE attempts" on public.bece_sunday_trial_attempts;
create policy "Public insert Sunday BECE attempts"
  on public.bece_sunday_trial_attempts for insert
  with check (true);

drop policy if exists "Public read Sunday BECE leaderboard" on public.bece_sunday_trial_attempts;
create policy "Public read Sunday BECE leaderboard"
  on public.bece_sunday_trial_attempts for select
  using (true);
