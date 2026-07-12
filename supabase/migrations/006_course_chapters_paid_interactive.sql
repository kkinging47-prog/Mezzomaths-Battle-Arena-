alter table public.course_sessions
  add column if not exists access_type text default 'free' check (access_type in ('free','paid')),
  add column if not exists price numeric default 0,
  add column if not exists currency text default 'GHS';

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_sessions(id) on delete cascade,
  chapter_order integer not null default 1,
  title text not null,
  summary text,
  created_at timestamptz default now()
);

alter table public.course_lessons
  add column if not exists chapter_id uuid references public.course_chapters(id) on delete cascade,
  add column if not exists interactive_prompt text,
  add column if not exists homework_prompt text,
  add column if not exists classwork_prompt text;

create table if not exists public.course_chapter_quizzes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  quiz_order integer not null default 1,
  question text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text default 'A',
  explanation text,
  created_at timestamptz default now()
);

create table if not exists public.course_trials (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  trial_type text not null check (trial_type in ('homework','classwork')),
  title text not null,
  instructions text,
  created_at timestamptz default now()
);

create table if not exists public.course_trial_submissions (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.course_trials(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  response text,
  submitted_at timestamptz default now()
);

create index if not exists course_chapters_course_idx on public.course_chapters(course_id, chapter_order);
create index if not exists course_chapter_quizzes_chapter_idx on public.course_chapter_quizzes(chapter_id, quiz_order);
create index if not exists course_trials_chapter_idx on public.course_trials(chapter_id, trial_type);

alter table public.course_chapters enable row level security;
alter table public.course_chapter_quizzes enable row level security;
alter table public.course_trials enable row level security;
alter table public.course_trial_submissions enable row level security;

drop policy if exists "Everyone can read course chapters" on public.course_chapters;
create policy "Everyone can read course chapters" on public.course_chapters for select
  using (exists (select 1 from public.course_sessions c where c.id = course_id and c.status = 'published'));

drop policy if exists "Admins manage course chapters" on public.course_chapters;
create policy "Admins manage course chapters" on public.course_chapters for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Everyone can read course quizzes" on public.course_chapter_quizzes;
create policy "Everyone can read course quizzes" on public.course_chapter_quizzes for select
  using (exists (select 1 from public.course_chapters ch join public.course_sessions c on c.id = ch.course_id where ch.id = chapter_id and c.status = 'published'));

drop policy if exists "Admins manage course quizzes" on public.course_chapter_quizzes;
create policy "Admins manage course quizzes" on public.course_chapter_quizzes for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Everyone can read course trials" on public.course_trials;
create policy "Everyone can read course trials" on public.course_trials for select
  using (exists (select 1 from public.course_chapters ch join public.course_sessions c on c.id = ch.course_id where ch.id = chapter_id and c.status = 'published'));

drop policy if exists "Admins manage course trials" on public.course_trials;
create policy "Admins manage course trials" on public.course_trials for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Students submit own course trials" on public.course_trial_submissions;
create policy "Students submit own course trials" on public.course_trial_submissions for all
  using (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
