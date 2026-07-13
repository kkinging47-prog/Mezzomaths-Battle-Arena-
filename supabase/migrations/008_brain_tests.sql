create table if not exists public.brain_test_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  score integer not null default 0,
  total integer not null default 0,
  percent integer not null default 0,
  answers jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.brain_test_samples (
  id uuid primary key default gen_random_uuid(),
  title text,
  skill text,
  test_type text,
  prompt text,
  stimulus text,
  image_svg text,
  options jsonb default '[]'::jsonb,
  answer text,
  explanation text,
  reveal_ms integer default 6000,
  difficulty text default 'Starter',
  status text default 'published' check (status in ('draft','published')),
  created_at timestamptz default now()
);

create index if not exists brain_test_results_student_idx on public.brain_test_results(student_id, created_at desc);
create index if not exists brain_test_samples_status_idx on public.brain_test_samples(status, difficulty);

alter table public.brain_test_results enable row level security;
alter table public.brain_test_samples enable row level security;

drop policy if exists "Students manage own brain results" on public.brain_test_results;
create policy "Students manage own brain results" on public.brain_test_results for all
  using (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')))
  with check (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));

drop policy if exists "Everyone reads published brain samples" on public.brain_test_samples;
create policy "Everyone reads published brain samples" on public.brain_test_samples for select
  using (status = 'published' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));

drop policy if exists "Admins manage brain samples" on public.brain_test_samples;
create policy "Admins manage brain samples" on public.brain_test_samples for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
