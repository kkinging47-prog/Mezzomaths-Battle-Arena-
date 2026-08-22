-- Consolidate assignment read policies to avoid duplicate permissive-policy evaluation.
drop policy if exists "Staff oversee all teacher assignments" on public.teacher_assignments;
drop policy if exists "Consolidated authenticated read" on public.teacher_assignments;
create policy "Consolidated authenticated read" on public.teacher_assignments for select to authenticated using (
  (status='published' and now()<=closes_at) or teacher_id=(select auth.uid()) or
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved')))
);

drop policy if exists "Staff read all assignment attempts" on public.teacher_assignment_attempts;
drop policy if exists "Public reads assignment leaderboard" on public.teacher_assignment_attempts;
create policy "Consolidated assignment attempt read" on public.teacher_assignment_attempts for select to anon,authenticated using (
  exists(select 1 from public.teacher_assignments a where a.id=assignment_id and (a.show_leaderboard or a.teacher_id=(select auth.uid()))) or
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved')))
);

drop policy if exists "Staff read all assignment responses" on public.teacher_assignment_responses;
drop policy if exists "Teachers read assignment responses" on public.teacher_assignment_responses;
create policy "Consolidated assignment response read" on public.teacher_assignment_responses for select to authenticated using (
  exists(select 1 from public.teacher_assignments a where a.id=assignment_id and a.teacher_id=(select auth.uid())) or
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved')))
);

drop policy if exists "Staff read all assignment questions" on public.teacher_assignment_questions;
drop policy if exists "Teachers manage assignment questions" on public.teacher_assignment_questions;
create policy "Consolidated assignment question read" on public.teacher_assignment_questions for select to authenticated using (
  exists(select 1 from public.teacher_assignments a where a.id=assignment_id and a.teacher_id=(select auth.uid())) or
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved')))
);
create policy "Teachers insert assignment questions" on public.teacher_assignment_questions for insert to authenticated with check (
  exists(select 1 from public.teacher_assignments a where a.id=assignment_id and a.teacher_id=(select auth.uid()))
);
create policy "Teachers update assignment questions" on public.teacher_assignment_questions for update to authenticated
using (exists(select 1 from public.teacher_assignments a where a.id=assignment_id and a.teacher_id=(select auth.uid())))
with check (exists(select 1 from public.teacher_assignments a where a.id=assignment_id and a.teacher_id=(select auth.uid())));
create policy "Teachers delete assignment questions" on public.teacher_assignment_questions for delete to authenticated using (
  exists(select 1 from public.teacher_assignments a where a.id=assignment_id and a.teacher_id=(select auth.uid()))
);
