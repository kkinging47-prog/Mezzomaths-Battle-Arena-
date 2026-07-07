-- Mezzo Maths Battle Arena Supabase Schema
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  date_of_birth date,
  age integer,
  school_name text,
  location text,
  class_level text check (class_level in ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3')),
  curriculum text check (curriculum in ('GES','Cambridge','Pearson Edexcel')),
  role text default 'student' check (role in ('student','admin')),
  avatar_url text,
  coins integer default 0,
  xp integer default 0,
  streak_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  class_level text not null check (class_level in ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3')),
  curriculum text not null check (curriculum in ('GES','Cambridge','Pearson Edexcel')),
  topic text not null,
  difficulty integer not null default 1 check (difficulty between 1 and 20),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  explanation text,
  image_url text,
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  class_level text not null,
  curriculum text not null,
  topic text not null,
  practice_type text default 'solo',
  level_number integer default 1 check (level_number between 1 and 100),
  question_count integer default 15,
  score integer default 0,
  pass_mark integer default 13,
  passed boolean generated always as (score >= pass_mark) stored,
  xp_awarded integer default 0,
  coins_awarded integer default 0,
  time_limit_seconds integer,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.practice_sessions(id) on delete cascade,
  question_id uuid references public.question_bank(id),
  selected_answer text check (selected_answer in ('A','B','C','D')),
  is_correct boolean,
  response_time_seconds integer,
  created_at timestamptz default now()
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  school_name text,
  location text,
  class_level text,
  curriculum text,
  xp integer default 0,
  wins integer default 0,
  accuracy numeric(5,2) default 0,
  scope text default 'national' check (scope in ('school','region','national','weekly')),
  week_start date,
  updated_at timestamptz default now(),
  unique(student_id, scope, week_start)
);

create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  title text not null,
  class_level text,
  curriculum text,
  topic text,
  question_count integer default 15,
  pass_mark integer default 13,
  xp_reward integer default 250,
  coin_reward integer default 50,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  class_level text not null,
  curriculum text not null,
  topic text,
  current_level integer default 1 check (current_level between 1 and 100),
  highest_level_unlocked integer default 1 check (highest_level_unlocked between 1 and 100),
  total_xp integer default 0,
  total_coins integer default 0,
  total_questions_answered integer default 0,
  total_correct integer default 0,
  updated_at timestamptz default now(),
  unique(student_id, class_level, curriculum, topic)
);

alter table public.profiles enable row level security;
alter table public.question_bank enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.session_answers enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.student_progress enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Active questions are readable" on public.question_bank for select using (is_active = true);
create policy "Admins manage questions" on public.question_bank for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "Students manage own sessions" on public.practice_sessions for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Students manage own answers" on public.session_answers for all using (
  exists (select 1 from public.practice_sessions s where s.id = session_id and s.student_id = auth.uid())
);
create policy "Leaderboard readable by users" on public.leaderboard_entries for select using (true);
create policy "Daily challenges readable" on public.daily_challenges for select using (is_active = true);
create policy "Students read own progress" on public.student_progress for select using (student_id = auth.uid());
create policy "Students update own progress" on public.student_progress for all using (student_id = auth.uid()) with check (student_id = auth.uid());
