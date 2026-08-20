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
  region text,
  class_level text check (class_level in ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3')),
  curriculum text check (curriculum in ('GES','Cambridge','Pearson Edexcel')),
  academic_term text default 'Term 1',
  role text default 'student' check (role in ('student','admin')),
  avatar_url text,
  coins integer default 0,
  xp integer default 0,
  streak_count integer default 0,
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists academic_term text default 'Term 1';

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

create table if not exists public.auth_access_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('signup','login','logout')),
  email text, school_name text, location text, region text, class_level text, academic_term text,
  occurred_at timestamptz default now()
);

create table if not exists public.academic_progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  academic_year text not null, academic_term text not null, class_level text not null, curriculum text,
  topic text, course_id text,
  assessment_type text check (assessment_type in ('pretest','posttest','practice','course')),
  score integer default 0, total integer default 0, percent numeric(5,2), learning_mode text,
  metadata jsonb default '{}'::jsonb, completed_at timestamptz default now()
);

create table if not exists public.learning_style_profiles (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  reading_score integer default 0, video_score integer default 0, interactive_score integer default 0,
  practice_score integer default 0, dominant_style text, evidence jsonb default '{}'::jsonb,
  ai_summary text, updated_at timestamptz default now()
);

create table if not exists public.career_guidance_results (
  id uuid primary key default gen_random_uuid(), student_id uuid references public.profiles(id) on delete cascade,
  stage integer not null check (stage between 1 and 3), answers jsonb default '{}'::jsonb,
  recommendations jsonb default '[]'::jsonb, summary text, completed_at timestamptz default now()
);

create table if not exists public.learner_monitoring_profiles (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  gender text, support_need text, access_device text, connectivity text,
  consented_at timestamptz, updated_at timestamptz default now()
);

create table if not exists public.program_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  event_type text not null, school_name text, location text, region text,
  class_level text, academic_term text, course_id text, topic text,
  learning_mode text, metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz default now()
);

create table if not exists public.junior_questions (
  id text primary key, level text not null check (level in ('Kindergarten','Grade 1','Grade 2')),
  topic text not null, skill text not null, activity_type text not null,
  difficulty text default 'Easy', status text default 'Draft', prompt text not null,
  spoken text, options jsonb default '[]'::jsonb, correct_answer text,
  explanation text, image_url text, image_alt text, audio_url text,
  visual jsonb default '{}'::jsonb, created_by uuid references public.profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.junior_activity_sessions (
  id text primary key, user_id uuid references public.profiles(id) on delete cascade,
  class_level text not null, topic text not null, assessment_type text not null,
  score integer default 0, total integer default 0, percent numeric(5,2),
  game_mode text default 'Individual', started_at timestamptz, completed_at timestamptz default now()
);

create table if not exists public.junior_responses (
  id uuid primary key default gen_random_uuid(), session_id text references public.junior_activity_sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade, question_id text,
  prompt text, answer text, correct_answer text, correct boolean, skill text,
  activity text, response_ms integer, created_at timestamptz default now()
);

create table if not exists public.junior_skill_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
  class_level text not null, topic text not null, skill text not null,
  correct_count integer default 0, wrong_count integer default 0, mastery numeric(5,2) default 0,
  help_uses integer default 0, voice_replays integer default 0, updated_at timestamptz default now(),
  unique(user_id,class_level,topic,skill)
);

create table if not exists public.junior_rewards (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stars integer default 0, stickers jsonb default '[]'::jsonb, badges jsonb default '[]'::jsonb,
  puzzle_pieces integer default 0, updated_at timestamptz default now()
);

create table if not exists public.junior_classroom_sessions (
  id uuid primary key default gen_random_uuid(), teacher_id uuid references public.profiles(id) on delete cascade,
  class_level text not null, topic text, activity_type text, game_mode text,
  configuration jsonb default '{}'::jsonb, team_results jsonb default '{}'::jsonb,
  started_at timestamptz default now(), completed_at timestamptz
);

create table if not exists public.junior_media_assets (
  id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id),
  asset_type text check (asset_type in ('image','audio','video')), url text not null,
  alt_text text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now()
);

create index if not exists junior_questions_lookup_idx on public.junior_questions(level,activity_type,status);
create index if not exists junior_sessions_user_idx on public.junior_activity_sessions(user_id,completed_at desc);
create index if not exists junior_responses_user_idx on public.junior_responses(user_id,created_at desc);
create index if not exists junior_classrooms_teacher_idx on public.junior_classroom_sessions(teacher_id,started_at desc);

alter table public.profiles enable row level security;
alter table public.question_bank enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.session_answers enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.student_progress enable row level security;
alter table public.auth_access_records enable row level security;
alter table public.academic_progress_records enable row level security;
alter table public.learning_style_profiles enable row level security;
alter table public.career_guidance_results enable row level security;
alter table public.learner_monitoring_profiles enable row level security;
alter table public.program_monitoring_events enable row level security;
alter table public.junior_questions enable row level security;
alter table public.junior_activity_sessions enable row level security;
alter table public.junior_responses enable row level security;
alter table public.junior_skill_progress enable row level security;
alter table public.junior_rewards enable row level security;
alter table public.junior_classroom_sessions enable row level security;
alter table public.junior_media_assets enable row level security;

-- Policies are dropped first so this complete schema can be run repeatedly.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Active questions are readable" on public.question_bank;
drop policy if exists "Admins manage questions" on public.question_bank;
drop policy if exists "Students manage own sessions" on public.practice_sessions;
drop policy if exists "Students manage own answers" on public.session_answers;
drop policy if exists "Leaderboard readable by users" on public.leaderboard_entries;
drop policy if exists "Daily challenges readable" on public.daily_challenges;
drop policy if exists "Students read own progress" on public.student_progress;
drop policy if exists "Students update own progress" on public.student_progress;
drop policy if exists "Users write own access records" on public.auth_access_records;
drop policy if exists "Admins read access records" on public.auth_access_records;
drop policy if exists "Students manage academic progress" on public.academic_progress_records;
drop policy if exists "Admins read academic progress" on public.academic_progress_records;
drop policy if exists "Students manage learning styles" on public.learning_style_profiles;
drop policy if exists "Students manage career guidance" on public.career_guidance_results;
drop policy if exists "Students manage monitoring profile" on public.learner_monitoring_profiles;
drop policy if exists "Students write monitoring events" on public.program_monitoring_events;
drop policy if exists "Admins read monitoring profiles" on public.learner_monitoring_profiles;
drop policy if exists "Admins read monitoring events" on public.program_monitoring_events;
drop policy if exists "Published junior questions are readable" on public.junior_questions;
drop policy if exists "Admins manage junior questions" on public.junior_questions;
drop policy if exists "Learners manage junior sessions" on public.junior_activity_sessions;
drop policy if exists "Learners manage junior responses" on public.junior_responses;
drop policy if exists "Learners manage junior progress" on public.junior_skill_progress;
drop policy if exists "Learners manage junior rewards" on public.junior_rewards;
drop policy if exists "Teachers manage junior classrooms" on public.junior_classroom_sessions;
drop policy if exists "Junior media is readable" on public.junior_media_assets;
drop policy if exists "Admins manage junior media" on public.junior_media_assets;

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
create policy "Users write own access records" on public.auth_access_records for insert with check (user_id = auth.uid());
create policy "Admins read access records" on public.auth_access_records for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Students manage academic progress" on public.academic_progress_records for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Admins read academic progress" on public.academic_progress_records for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Students manage learning styles" on public.learning_style_profiles for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Students manage career guidance" on public.career_guidance_results for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Students manage monitoring profile" on public.learner_monitoring_profiles for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Students write monitoring events" on public.program_monitoring_events for insert with check (student_id = auth.uid());
create policy "Admins read monitoring profiles" on public.learner_monitoring_profiles for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Admins read monitoring events" on public.program_monitoring_events for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Published junior questions are readable" on public.junior_questions for select using (status = 'Published' or created_by = auth.uid());
create policy "Admins manage junior questions" on public.junior_questions for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Learners manage junior sessions" on public.junior_activity_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Learners manage junior responses" on public.junior_responses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Learners manage junior progress" on public.junior_skill_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Learners manage junior rewards" on public.junior_rewards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Teachers manage junior classrooms" on public.junior_classroom_sessions for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "Junior media is readable" on public.junior_media_assets for select using (true);
create policy "Admins manage junior media" on public.junior_media_assets for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
