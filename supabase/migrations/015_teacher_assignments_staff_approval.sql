-- Scheduled teacher assignments, public classroom participation and Mezzo Staff approval.
-- Idempotent: safe to run repeatedly after 014_fix_profiles_rls_recursion.sql.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists approval_status text not null default 'approved',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_approval_status_check;
alter table public.profiles add constraint profiles_approval_status_check
  check (approval_status in ('pending','approved','rejected'));

create or replace function public.protect_profile_role_and_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'admin' then new.role := 'student'; end if;
    if new.role = 'mezzo_staff' then new.approval_status := 'pending';
    else new.approval_status := 'approved'; end if;
  elsif public.current_profile_role() <> 'admin' then
    new.role := old.role;
    new.approval_status := old.approval_status;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role_and_approval() from public, anon, authenticated;
drop trigger if exists protect_profile_role_and_approval_trigger on public.profiles;
create trigger protect_profile_role_and_approval_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile_role_and_approval();

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  title text not null,
  instructions text default '',
  class_level text not null,
  curriculum text not null default 'GES',
  topic text not null,
  question_count integer not null check (question_count between 1 and 100),
  duration_minutes integer not null check (duration_minutes between 1 and 180),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'published' check (status in ('draft','published','closed','archived')),
  show_leaderboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.teacher_assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  question_id uuid references public.question_bank(id) on delete set null,
  position integer not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  explanation text default '',
  unique (assignment_id, position)
);

create table if not exists public.teacher_assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  participant_name text not null,
  participant_class text not null,
  participant_school text default '',
  score integer not null default 0,
  total integer not null check (total > 0),
  percent numeric(5,2) not null default 0,
  time_seconds integer not null default 0,
  submitted_at timestamptz not null default now()
);

create table if not exists public.teacher_assignment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.teacher_assignment_attempts(id) on delete cascade,
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  question_position integer not null,
  selected_answer text,
  correct_answer text not null,
  is_correct boolean not null,
  response_seconds integer not null default 0
);

create index if not exists teacher_assignments_owner_idx on public.teacher_assignments(teacher_id, created_at desc);
create index if not exists teacher_assignments_code_idx on public.teacher_assignments(code);
create index if not exists teacher_assignments_window_idx on public.teacher_assignments(status, opens_at, closes_at);
create index if not exists teacher_assignment_questions_assignment_idx on public.teacher_assignment_questions(assignment_id, position);
create index if not exists teacher_assignment_attempts_assignment_idx on public.teacher_assignment_attempts(assignment_id, score desc, time_seconds asc);
create index if not exists teacher_assignment_responses_attempt_idx on public.teacher_assignment_responses(attempt_id, question_position);

alter table public.teacher_assignments enable row level security;
alter table public.teacher_assignment_questions enable row level security;
alter table public.teacher_assignment_attempts enable row level security;
alter table public.teacher_assignment_responses enable row level security;

grant select on public.teacher_assignments, public.teacher_assignment_attempts to anon, authenticated;
grant select on public.teacher_assignment_questions to authenticated;
grant insert on public.teacher_assignment_attempts, public.teacher_assignment_responses to anon, authenticated;
grant insert, update, delete on public.teacher_assignments, public.teacher_assignment_questions to authenticated;

drop policy if exists "Teachers manage own assignments" on public.teacher_assignments;
create policy "Teachers manage own assignments" on public.teacher_assignments
for all to authenticated
using ((select auth.uid()) = teacher_id and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role in ('teacher','admin') or (p.role = 'mezzo_staff' and p.approval_status = 'approved'))))
with check ((select auth.uid()) = teacher_id and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role in ('teacher','admin') or (p.role = 'mezzo_staff' and p.approval_status = 'approved'))));

drop policy if exists "Public reads available assignments" on public.teacher_assignments;
create policy "Public reads available assignments" on public.teacher_assignments
for select to anon, authenticated
using (status = 'published' and now() <= closes_at);

drop policy if exists "Teachers manage assignment questions" on public.teacher_assignment_questions;
create policy "Teachers manage assignment questions" on public.teacher_assignment_questions
for all to authenticated
using (exists (select 1 from public.teacher_assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid())))
with check (exists (select 1 from public.teacher_assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid())));

drop policy if exists "Public reads available assignment questions" on public.teacher_assignment_questions;

drop policy if exists "Participants submit assignment attempts" on public.teacher_assignment_attempts;
create policy "Participants submit assignment attempts" on public.teacher_assignment_attempts
for insert to anon, authenticated
with check (exists (select 1 from public.teacher_assignments a where a.id = assignment_id and a.status = 'published' and now() between a.opens_at and a.closes_at));

drop policy if exists "Public reads assignment leaderboard" on public.teacher_assignment_attempts;
create policy "Public reads assignment leaderboard" on public.teacher_assignment_attempts
for select to anon, authenticated
using (exists (select 1 from public.teacher_assignments a where a.id = assignment_id and (a.show_leaderboard = true or a.teacher_id = (select auth.uid()))));

drop policy if exists "Participants submit assignment responses" on public.teacher_assignment_responses;
create policy "Participants submit assignment responses" on public.teacher_assignment_responses
for insert to anon, authenticated
with check (exists (select 1 from public.teacher_assignments a where a.id = assignment_id and a.status = 'published' and now() between a.opens_at and a.closes_at));

drop policy if exists "Teachers read assignment responses" on public.teacher_assignment_responses;
create policy "Teachers read assignment responses" on public.teacher_assignment_responses
for select to authenticated
using (exists (select 1 from public.teacher_assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid())));
