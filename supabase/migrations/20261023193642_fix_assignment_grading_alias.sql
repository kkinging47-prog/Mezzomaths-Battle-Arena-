create or replace function public.grade_mixed_assignment(p_actor uuid,p_attempt uuid,p_grades jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare t public.teacher_assignment_attempts%rowtype; a public.teacher_assignments%rowtype; g jsonb; r public.teacher_assignment_responses%rowtype; new_score numeric; pending numeric;
begin
 select * into t from public.teacher_assignment_attempts where id=p_attempt for update;
 if not found then raise exception 'Attempt not found.'; end if;
 select * into a from public.teacher_assignments where id=t.assignment_id;
 if not exists(select 1 from public.profiles p where p.id=p_actor and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved') or (p.role='teacher' and a.teacher_id=p_actor))) then raise exception 'Not authorised to mark this assignment.'; end if;
 if jsonb_typeof(p_grades)<>'array' or jsonb_array_length(p_grades) not between 1 and 100 then raise exception 'Provide marks for 1–100 responses.'; end if;
 if (select count(distinct entries.item->>'response_id') from jsonb_array_elements(p_grades) as entries(item))<>jsonb_array_length(p_grades) then raise exception 'Duplicate grading rows.'; end if;
 for g in select * from jsonb_array_elements(p_grades) loop
  select * into r from public.teacher_assignment_responses where id=(g->>'response_id')::uuid and attempt_id=t.id for update;
  if not found then raise exception 'Response not found for this attempt.'; end if;
  if not exists(select 1 from public.teacher_assignment_questions q where q.assignment_id=a.id and q.position=r.question_position and q.marking='teacher_review') then raise exception 'Only teacher-review answers may be marked here.'; end if;
  if g->>'marks' is null or (g->>'marks')::numeric<0 or (g->>'marks')::numeric>r.max_marks or (g->>'marks')::numeric<>round((g->>'marks')::numeric,2) then raise exception 'Award between 0 and the available marks, with up to 2 decimal places.'; end if;
  update public.teacher_assignment_responses set awarded_marks=(g->>'marks')::numeric,is_correct=(g->>'marks')::numeric=max_marks,grading_status='graded',teacher_feedback=left(coalesce(g->>'feedback',''),4000),graded_by=p_actor,graded_at=now() where id=r.id;
 end loop;
 select sum(coalesce(awarded_marks,0)),coalesce(sum(max_marks) filter(where grading_status='pending'),0) into new_score,pending from public.teacher_assignment_responses where attempt_id=t.id;
 update public.teacher_assignment_attempts set score=new_score,percent=round(100*new_score/total,2),pending_marks=pending,grading_status=case when pending>0 then 'pending' else 'graded' end where id=t.id returning * into t;
 return to_jsonb(t);
end $$;
