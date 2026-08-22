-- Blooket-inspired teacher assignment and practice workspace for Mezzo Maths.
alter table public.teacher_assignments
  add column if not exists assignment_type text not null default 'homework',
  add column if not exists target_group text,
  add column if not exists max_attempts integer not null default 1,
  add column if not exists pass_mark integer not null default 50,
  add column if not exists feedback_mode text not null default 'after_submit',
  add column if not exists shuffle_questions boolean not null default true;

alter table public.teacher_assignments drop constraint if exists teacher_assignments_assignment_type_check;
alter table public.teacher_assignments add constraint teacher_assignments_assignment_type_check
  check (assignment_type in ('practice','homework','quiz','exam'));
alter table public.teacher_assignments drop constraint if exists teacher_assignments_max_attempts_check;
alter table public.teacher_assignments add constraint teacher_assignments_max_attempts_check check (max_attempts between 1 and 10);
alter table public.teacher_assignments drop constraint if exists teacher_assignments_pass_mark_check;
alter table public.teacher_assignments add constraint teacher_assignments_pass_mark_check check (pass_mark between 0 and 100);
alter table public.teacher_assignments drop constraint if exists teacher_assignments_feedback_mode_check;
alter table public.teacher_assignments add constraint teacher_assignments_feedback_mode_check
  check (feedback_mode in ('immediate','after_submit','after_close','score_only'));

create index if not exists teacher_assignments_staff_history_idx
  on public.teacher_assignments (status, closes_at desc, created_at desc);
create index if not exists teacher_assignment_attempts_assignment_participant_idx
  on public.teacher_assignment_attempts (assignment_id, lower(participant_name));

drop policy if exists "Staff oversee all teacher assignments" on public.teacher_assignments;
create policy "Staff oversee all teacher assignments" on public.teacher_assignments for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and
  (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved'))));

drop policy if exists "Staff read all assignment questions" on public.teacher_assignment_questions;
create policy "Staff read all assignment questions" on public.teacher_assignment_questions for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and
  (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved'))));

drop policy if exists "Staff read all assignment attempts" on public.teacher_assignment_attempts;
create policy "Staff read all assignment attempts" on public.teacher_assignment_attempts for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and
  (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved'))));

drop policy if exists "Staff read all assignment responses" on public.teacher_assignment_responses;
create policy "Staff read all assignment responses" on public.teacher_assignment_responses for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and
  (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved'))));

do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='teacher_assignments' and column_name='assignment_type') then
    raise exception 'teacher assignment workspace migration did not apply';
  end if;
end $$;
