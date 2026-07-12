alter table public.course_sessions
  add column if not exists instructor text,
  add column if not exists outcomes text,
  add column if not exists requirements text,
  add column if not exists course_level text default 'Beginner',
  add column if not exists drip_mode text default 'all' check (drip_mode in ('all','chapter','date')),
  add column if not exists prerequisite_course_id uuid references public.course_sessions(id) on delete set null,
  add column if not exists completion_rules jsonb default '{"allLessons":true,"minQuizScore":70,"requireHomework":false,"requireClasswork":false,"requireFinal":false,"finalPass":70}'::jsonb;

create table if not exists public.course_purchases (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  amount numeric default 0,
  currency text default 'GHS',
  coupon_code text,
  paystack_reference text,
  status text default 'pending' check (status in ('pending','success','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.course_coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  course_id uuid references public.course_sessions(id) on delete cascade,
  discount_percent numeric default 100,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.course_access_grants (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  granted_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text unique not null,
  course_id uuid references public.course_sessions(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  student_name text,
  course_title text,
  class_level text,
  final_score numeric,
  issued_at timestamptz default now()
);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  student_email text,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.course_discussions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  chapter_id uuid references public.course_chapters(id) on delete cascade,
  lesson_id uuid references public.course_lessons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  role text,
  comment text not null,
  parent_id uuid references public.course_discussions(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.course_notifications (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.course_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  role text,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.course_trial_submissions
  add column if not exists teacher_comment text,
  add column if not exists score numeric,
  add column if not exists status text default 'submitted';

create table if not exists public.course_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.course_trial_submissions(id) on delete cascade,
  file_name text,
  file_type text,
  file_url text,
  uploaded_at timestamptz default now()
);

alter table public.course_purchases enable row level security;
alter table public.course_coupons enable row level security;
alter table public.course_access_grants enable row level security;
alter table public.course_certificates enable row level security;
alter table public.course_reviews enable row level security;
alter table public.course_discussions enable row level security;
alter table public.course_notifications enable row level security;
alter table public.course_submission_files enable row level security;

drop policy if exists "Students read own purchases" on public.course_purchases;
create policy "Students read own purchases" on public.course_purchases for select using (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
drop policy if exists "Admins manage purchases" on public.course_purchases;
create policy "Admins manage purchases" on public.course_purchases for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Everyone reads active coupons" on public.course_coupons;
create policy "Everyone reads active coupons" on public.course_coupons for select using (active = true or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins manage coupons" on public.course_coupons;
create policy "Admins manage coupons" on public.course_coupons for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Students read own course grants" on public.course_access_grants;
create policy "Students read own course grants" on public.course_access_grants for select using (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
drop policy if exists "Admins manage course grants" on public.course_access_grants;
create policy "Admins manage course grants" on public.course_access_grants for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Students read own certificates" on public.course_certificates;
create policy "Students read own certificates" on public.course_certificates for select using (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
drop policy if exists "Admins manage certificates" on public.course_certificates;
create policy "Admins manage certificates" on public.course_certificates for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Everyone reads course reviews" on public.course_reviews;
create policy "Everyone reads course reviews" on public.course_reviews for select using (true);
drop policy if exists "Students write own reviews" on public.course_reviews;
create policy "Students write own reviews" on public.course_reviews for insert with check (student_id = auth.uid());

drop policy if exists "Course discussion visible to learners" on public.course_discussions;
create policy "Course discussion visible to learners" on public.course_discussions for select using (true);
drop policy if exists "Users create course discussions" on public.course_discussions;
create policy "Users create course discussions" on public.course_discussions for insert with check (user_id = auth.uid());

drop policy if exists "Users read own course notifications" on public.course_notifications;
create policy "Users read own course notifications" on public.course_notifications for select using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
drop policy if exists "Admins manage course notifications" on public.course_notifications;
create policy "Admins manage course notifications" on public.course_notifications for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));

drop policy if exists "Users read own submission files" on public.course_submission_files;
create policy "Users read own submission files" on public.course_submission_files for select using (exists (select 1 from public.course_trial_submissions s where s.id = submission_id and (s.student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')))));
drop policy if exists "Users upload own submission files" on public.course_submission_files;
create policy "Users upload own submission files" on public.course_submission_files for insert with check (exists (select 1 from public.course_trial_submissions s where s.id = submission_id and s.student_id = auth.uid()));