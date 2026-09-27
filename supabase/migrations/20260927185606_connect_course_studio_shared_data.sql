-- Course catalog metadata and learner progress.
alter table public.course_sessions
  add column if not exists cover_image text,
  add column if not exists featured boolean not null default false,
  add column if not exists course_document jsonb not null default '{}'::jsonb;
alter table public.course_enrollments
  add column if not exists progress_snapshot jsonb not null default '{}'::jsonb;
create index if not exists course_sessions_featured_published_idx
  on public.course_sessions (featured desc, updated_at desc) where status = 'published';
create index if not exists course_reviews_course_created_idx
  on public.course_reviews (course_id, created_at desc);

grant select on public.course_sessions to anon, authenticated;
grant insert, update, delete on public.course_sessions to authenticated;
grant select, insert, update on public.course_enrollments to authenticated;
grant select on public.course_reviews to anon, authenticated;
grant insert on public.course_reviews to authenticated;

-- Full lesson content stays separate from the public catalog row. RLS permits
-- administrators and enrolled learners to read it.
create table if not exists public.course_content (
  course_id uuid primary key references public.course_sessions(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.course_content enable row level security;
revoke all on public.course_content from public, anon;
grant select, insert, update, delete on public.course_content to authenticated;
drop policy if exists "Admins manage course content" on public.course_content;
create policy "Admins manage course content" on public.course_content
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists "Enrolled learners read course content" on public.course_content;
create policy "Enrolled learners read course content" on public.course_content
  for select to authenticated
  using (exists (select 1 from public.course_enrollments e
    where e.course_id = course_content.course_id and e.student_id = (select auth.uid())));

-- Learners may enrol themselves in published free courses. Paid access requires
-- a separate verified payment or administrator flow.
drop policy if exists "Students manage own course enrollments" on public.course_enrollments;
drop policy if exists "Learners read own enrollments" on public.course_enrollments;
create policy "Learners read own enrollments" on public.course_enrollments
  for select to authenticated
  using (student_id = (select auth.uid()) or exists
    (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists "Learners start free courses" on public.course_enrollments;
create policy "Learners start free courses" on public.course_enrollments
  for insert to authenticated
  with check (student_id = (select auth.uid()) and exists
    (select 1 from public.course_sessions c where c.id = course_id
      and c.status = 'published' and c.access_type = 'free'));
drop policy if exists "Learners update own course progress" on public.course_enrollments;
create policy "Learners update own course progress" on public.course_enrollments
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
drop policy if exists "Admins manage enrollments" on public.course_enrollments;
create policy "Admins manage enrollments" on public.course_enrollments
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
