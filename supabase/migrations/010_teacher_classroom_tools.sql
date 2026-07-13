create table if not exists public.teacher_classroom_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete set null,
  teacher_email text,
  teacher_name text,
  resource_type text not null check (resource_type in ('lessonPlan','lessonNotes','exam','homework','classwork','examples')),
  title text not null,
  class_level text,
  school_type text,
  term text,
  week text,
  strand text,
  sub_strand text,
  topic text,
  content_standard text,
  indicator text,
  performance_indicator text,
  core_competencies text,
  html_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.teacher_exam_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete set null,
  teacher_email text,
  title text not null,
  class_level text,
  term text,
  strand text,
  sub_strand text,
  topic text,
  assessment_type text,
  total_marks integer default 50,
  duration text,
  question_count integer default 30,
  marking_scheme jsonb default '{}'::jsonb,
  questions jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists teacher_classroom_resources_teacher_idx on public.teacher_classroom_resources(teacher_id, created_at desc);
create index if not exists teacher_classroom_resources_class_topic_idx on public.teacher_classroom_resources(class_level, strand, topic);
create index if not exists teacher_exam_sets_teacher_idx on public.teacher_exam_sets(teacher_id, created_at desc);

alter table public.teacher_classroom_resources enable row level security;
alter table public.teacher_exam_sets enable row level security;

drop policy if exists "Teachers manage own classroom resources" on public.teacher_classroom_resources;
create policy "Teachers manage own classroom resources"
  on public.teacher_classroom_resources for all
  using (
    teacher_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher'))
  )
  with check (
    teacher_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher'))
  );

drop policy if exists "Teachers manage own exam sets" on public.teacher_exam_sets;
create policy "Teachers manage own exam sets"
  on public.teacher_exam_sets for all
  using (
    teacher_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher'))
  )
  with check (
    teacher_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher'))
  );
