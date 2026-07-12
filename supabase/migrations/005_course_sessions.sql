create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class_level text not null,
  category text,
  duration text,
  cover_icon text default '🎓',
  summary text,
  status text default 'published' check (status in ('draft','published')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_sessions(id) on delete cascade,
  lesson_order integer not null default 1,
  title text not null,
  lesson_type text default 'Text Lesson',
  content text,
  video_url text,
  resource_url text,
  created_at timestamptz default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_sessions(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  progress_percent integer default 0,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique(course_id, student_id)
);

create table if not exists public.course_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_sessions(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  completed_at timestamptz default now(),
  unique(lesson_id, student_id)
);

create index if not exists course_sessions_class_idx on public.course_sessions(class_level, status);
create index if not exists course_lessons_course_idx on public.course_lessons(course_id, lesson_order);
create index if not exists course_enrollments_student_idx on public.course_enrollments(student_id, course_id);

alter table public.course_sessions enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_lesson_progress enable row level security;

drop policy if exists "Everyone can read published courses" on public.course_sessions;
create policy "Everyone can read published courses"
  on public.course_sessions for select
  using (status = 'published' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins manage courses" on public.course_sessions;
create policy "Admins manage courses"
  on public.course_sessions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Everyone can read course lessons" on public.course_lessons;
create policy "Everyone can read course lessons"
  on public.course_lessons for select
  using (exists (select 1 from public.course_sessions c where c.id = course_id and c.status = 'published'));

drop policy if exists "Admins manage course lessons" on public.course_lessons;
create policy "Admins manage course lessons"
  on public.course_lessons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Students manage own course enrollments" on public.course_enrollments;
create policy "Students manage own course enrollments"
  on public.course_enrollments for all
  using (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Students manage own lesson progress" on public.course_lesson_progress;
create policy "Students manage own lesson progress"
  on public.course_lesson_progress for all
  using (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (auth.uid() = student_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
