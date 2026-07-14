-- Optional production support for media-rich BECE questions and course assets.
-- The current frontend stores uploaded images/media locally for MVP use.
-- For production, upload files to Supabase Storage and store public URLs in these fields/tables.

alter table public.question_bank
  add column if not exists source_type text,
  add column if not exists source_name text,
  add column if not exists source_page text,
  add column if not exists question_image_url text,
  add column if not exists option_a_image_url text,
  add column if not exists option_b_image_url text,
  add column if not exists option_c_image_url text,
  add column if not exists option_d_image_url text;

create table if not exists public.bece_question_bank (
  id uuid primary key default gen_random_uuid(),
  year text default 'Sample',
  type text default 'pastStyle' check (type in ('pastStyle','samples')),
  topic text not null,
  question_text text not null,
  question_image_url text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  option_a_image_url text,
  option_b_image_url text,
  option_c_image_url text,
  option_d_image_url text,
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  explanation text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.course_media_assets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  chapter_title text,
  lesson_title text,
  asset_type text check (asset_type in ('video','audio','image','pdf','resource','other')),
  asset_url text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.course_interactive_tasks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  chapter_title text,
  lesson_title text,
  task_type text check (task_type in ('mini_quiz','classwork','homework','final','interactive_prompt')),
  prompt text not null,
  options jsonb default '[]'::jsonb,
  correct_answer text,
  explanation text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists bece_question_bank_year_type_idx on public.bece_question_bank(year, type);
create index if not exists bece_question_bank_topic_idx on public.bece_question_bank(topic);
create index if not exists course_media_assets_course_idx on public.course_media_assets(course_id);
create index if not exists course_interactive_tasks_course_idx on public.course_interactive_tasks(course_id);

alter table public.bece_question_bank enable row level security;
alter table public.course_media_assets enable row level security;
alter table public.course_interactive_tasks enable row level security;

drop policy if exists "BECE questions readable" on public.bece_question_bank;
create policy "BECE questions readable" on public.bece_question_bank for select using (true);

drop policy if exists "Admins manage BECE questions" on public.bece_question_bank;
create policy "Admins manage BECE questions" on public.bece_question_bank for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));

drop policy if exists "Course media readable" on public.course_media_assets;
create policy "Course media readable" on public.course_media_assets for select using (true);

drop policy if exists "Admins manage course media" on public.course_media_assets;
create policy "Admins manage course media" on public.course_media_assets for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));

drop policy if exists "Course tasks readable" on public.course_interactive_tasks;
create policy "Course tasks readable" on public.course_interactive_tasks for select using (true);

drop policy if exists "Admins manage course tasks" on public.course_interactive_tasks;
create policy "Admins manage course tasks" on public.course_interactive_tasks for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
