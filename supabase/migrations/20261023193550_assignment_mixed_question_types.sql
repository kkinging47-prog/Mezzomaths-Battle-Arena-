-- Backward-compatible additions: existing MCQs and recorded results keep their meaning.
alter table public.teacher_assignment_questions
 add column if not exists question_type text not null default 'single_select',
 add column if not exists marking text not null default 'auto',
 add column if not exists marks numeric(8,2) not null default 1,
 add column if not exists acceptable_answers jsonb not null default '[]',
 add column if not exists numeric_tolerance numeric not null default 0,
 add column if not exists question_image_url text not null default '',
 add column if not exists hint text not null default '',
 add column if not exists source_metadata jsonb not null default '{}';
alter table public.teacher_assignment_questions drop constraint if exists teacher_assignment_questions_correct_answer_check;
alter table public.teacher_assignment_questions add constraint assignment_question_format_check check (
 question_type in ('single_select','number','short_text','reasoning','investigation') and marking in ('auto','teacher_review')
 and marks>0 and marks<=100 and numeric_tolerance>=0 and numeric_tolerance<=100
 and jsonb_typeof(acceptable_answers)='array' and jsonb_typeof(source_metadata)='object'
 and (question_type not in ('reasoning','investigation') or marking='teacher_review')
 and (question_type<>'single_select' or (correct_answer in ('A','B','C','D') and option_a<>'' and option_b<>'' and option_c<>'' and option_d<>'')));
alter table public.teacher_assignment_attempts
 alter column score type numeric(10,2), alter column total type numeric(10,2),
 add column if not exists grading_status text not null default 'graded' check (grading_status in ('pending','graded')),
 add column if not exists pending_marks numeric(10,2) not null default 0,
 add column if not exists submission_key uuid;
create unique index if not exists assignment_submission_key_idx on public.teacher_assignment_attempts(assignment_id,submission_key) where submission_key is not null;
alter table public.teacher_assignment_responses
 alter column is_correct drop not null,
 add column if not exists awarded_marks numeric(8,2),
 add column if not exists max_marks numeric(8,2) not null default 1,
 add column if not exists grading_status text not null default 'graded' check (grading_status in ('pending','graded')),
 add column if not exists teacher_feedback text not null default '',
 add column if not exists graded_by uuid references auth.users(id),
 add column if not exists graded_at timestamptz;
update public.teacher_assignment_responses set awarded_marks=case when is_correct then 1 else 0 end where awarded_marks is null and grading_status='graded';
alter table public.teacher_assignment_responses add constraint assignment_response_marks_check check(max_marks>0 and max_marks<=100 and (awarded_marks is null or (awarded_marks>=0 and awarded_marks<=max_marks)));
-- One transaction publishes both the assignment and its question snapshots, or nothing.
create or replace function public.create_mixed_assignment(p_assignment jsonb,p_questions jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to publish assignments.'; end if;
 if jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions) not between 1 and 100 then raise exception 'Provide 1–100 questions.'; end if;
 insert into public.teacher_assignments(teacher_id,code,title,instructions,class_level,curriculum,topic,question_count,duration_minutes,opens_at,closes_at,status,show_leaderboard,assignment_type,target_group,max_attempts,pass_mark,feedback_mode,shuffle_questions)
 values(auth.uid(),p_assignment->>'code',p_assignment->>'title',coalesce(p_assignment->>'instructions',''),p_assignment->>'class_level',p_assignment->>'curriculum',p_assignment->>'topic',jsonb_array_length(p_questions),(p_assignment->>'duration_minutes')::int,(p_assignment->>'opens_at')::timestamptz,(p_assignment->>'closes_at')::timestamptz,'draft',coalesce((p_assignment->>'show_leaderboard')::boolean,false),p_assignment->>'assignment_type',p_assignment->>'target_group',coalesce((p_assignment->>'max_attempts')::int,1),coalesce((p_assignment->>'pass_mark')::numeric,50),p_assignment->>'feedback_mode',coalesce((p_assignment->>'shuffle_questions')::boolean,true)) returning id into new_id;
 insert into public.teacher_assignment_questions(assignment_id,question_id,position,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,question_type,marking,marks,acceptable_answers,numeric_tolerance,question_image_url,hint,source_metadata)
 select new_id,nullif(q->>'question_id','')::uuid,ord::int,q->>'question_text',coalesce(q->>'option_a',''),coalesce(q->>'option_b',''),coalesce(q->>'option_c',''),coalesce(q->>'option_d',''),coalesce(q->>'correct_answer',''),coalesce(q->>'explanation',''),coalesce(q->>'question_type','single_select'),coalesce(q->>'marking','auto'),coalesce((q->>'marks')::numeric,1),coalesce(q->'acceptable_answers','[]'),coalesce((q->>'numeric_tolerance')::numeric,0),coalesce(q->>'question_image_url',''),coalesce(q->>'hint',''),coalesce(q->'source_metadata','{}') from jsonb_array_elements(p_questions) with ordinality x(q,ord);
 update public.teacher_assignments set status='published' where id=new_id;
 return new_id;
end $$;
revoke all on function public.create_mixed_assignment(jsonb,jsonb) from public,anon;
grant execute on function public.create_mixed_assignment(jsonb,jsonb) to authenticated;
-- Server-only transaction: lock the assignment to serialize attempt-limit checks and retries.
create or replace function public.record_mixed_assignment(p_assignment_id uuid,p_name text,p_class text,p_school text,p_key uuid,p_elapsed integer,p_responses jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare a public.teacher_assignments%rowtype; previous public.teacher_assignment_attempts%rowtype; new_id uuid; max_total numeric; earned numeric; pending numeric; state text;
begin
 select * into a from public.teacher_assignments where id=p_assignment_id for update;
 if not found then raise exception 'Assignment not found.'; end if;
 select * into previous from public.teacher_assignment_attempts where assignment_id=a.id and submission_key=p_key;
 if found then return to_jsonb(previous); end if;
 if a.status<>'published' or now()<a.opens_at or now()>a.closes_at then raise exception 'The assignment is not open for submissions.'; end if;
 if (select count(*) from public.teacher_assignment_attempts where assignment_id=a.id and lower(trim(participant_name))=lower(trim(p_name)))>=a.max_attempts then raise exception 'Maximum attempts reached for this learner name.'; end if;
 if jsonb_typeof(p_responses)<>'array' or jsonb_array_length(p_responses)<>(select count(*) from public.teacher_assignment_questions where assignment_id=a.id) then raise exception 'Incomplete response set.'; end if;
 if (select count(distinct (r->>'position')::int) from jsonb_array_elements(p_responses)r)<>jsonb_array_length(p_responses) then raise exception 'Duplicate responses.'; end if;
 if exists(select 1 from jsonb_array_elements(p_responses)r left join public.teacher_assignment_questions q on q.assignment_id=a.id and q.position=(r->>'position')::int where q.id is null or (r->>'max_marks')::numeric<>q.marks or (r->>'grading_status')<>case when q.marking='teacher_review' then 'pending' else 'graded' end) then raise exception 'Response format does not match the assignment.'; end if;
 select sum((r->>'max_marks')::numeric),sum(coalesce((r->>'awarded_marks')::numeric,0)),sum(case when r->>'grading_status'='pending' then (r->>'max_marks')::numeric else 0 end) into max_total,earned,pending from jsonb_array_elements(p_responses)r;
 state:=case when pending>0 then 'pending' else 'graded' end;
 insert into public.teacher_assignment_attempts(assignment_id,participant_name,participant_class,participant_school,score,total,percent,time_seconds,grading_status,pending_marks,submission_key)
 values(a.id,p_name,p_class,p_school,earned,max_total,round(100*earned/max_total,2),p_elapsed,state,pending,p_key) returning id into new_id;
 insert into public.teacher_assignment_responses(attempt_id,assignment_id,question_position,selected_answer,correct_answer,is_correct,awarded_marks,max_marks,grading_status)
 select new_id,a.id,(r->>'position')::int,r->>'selected_answer',coalesce(r->>'correct_answer',''),(r->>'is_correct')::boolean,(r->>'awarded_marks')::numeric,(r->>'max_marks')::numeric,r->>'grading_status' from jsonb_array_elements(p_responses)r;
 return (select to_jsonb(t) from public.teacher_assignment_attempts t where id=new_id);
end $$;
revoke all on function public.record_mixed_assignment(uuid,text,text,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.record_mixed_assignment(uuid,text,text,text,uuid,integer,jsonb) to service_role;
-- Server-only grading transaction. Caller identity is independently verified by the API.
create or replace function public.grade_mixed_assignment(p_actor uuid,p_attempt uuid,p_grades jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare t public.teacher_assignment_attempts%rowtype; a public.teacher_assignments%rowtype; g jsonb; r public.teacher_assignment_responses%rowtype; new_score numeric; pending numeric;
begin
 select * into t from public.teacher_assignment_attempts where id=p_attempt for update;
 if not found then raise exception 'Attempt not found.'; end if;
 select * into a from public.teacher_assignments where id=t.assignment_id;
 if not exists(select 1 from public.profiles p where p.id=p_actor and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved') or (p.role='teacher' and a.teacher_id=p_actor))) then raise exception 'Not authorised to mark this assignment.'; end if;
 if jsonb_typeof(p_grades)<>'array' or jsonb_array_length(p_grades) not between 1 and 100 then raise exception 'Provide marks for 1–100 responses.'; end if;
 if (select count(distinct g->>'response_id') from jsonb_array_elements(p_grades)g)<>jsonb_array_length(p_grades) then raise exception 'Duplicate grading rows.'; end if;
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
revoke all on function public.grade_mixed_assignment(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.grade_mixed_assignment(uuid,uuid,jsonb) to service_role;
-- Submission is server-marked: clients cannot forge scores or read private submission receipts.
revoke insert on public.teacher_assignment_attempts,public.teacher_assignment_responses from anon,authenticated;
revoke select on public.teacher_assignment_attempts from anon,authenticated;
grant select(id,assignment_id,participant_name,participant_class,participant_school,score,total,percent,time_seconds,submitted_at,grading_status,pending_marks) on public.teacher_assignment_attempts to anon,authenticated;
notify pgrst,'reload schema';
