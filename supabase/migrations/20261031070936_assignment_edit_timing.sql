-- Atomic edit, called only by the authenticated server after verifying the actor's token.
create or replace function public.edit_teacher_assignment(p_actor uuid,p_id uuid,p_version timestamptz,p_settings jsonb,p_questions jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare a public.teacher_assignments%rowtype; item jsonb; old public.teacher_assignment_questions%rowtype; content_locked boolean;
begin
 select * into a from public.teacher_assignments where id=p_id for update;
 if not found then raise exception 'Assignment not found.'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_actor and (p.role='admin' or (p.role='mezzo_staff' and p.approval_status='approved') or (p.role='teacher' and a.teacher_id=p_actor))) then raise exception 'Not authorised to edit this assignment.'; end if;
 if a.updated_at is distinct from p_version then raise exception 'Assignment changed. Reopen the editor and try again.'; end if;
 if jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions)<>a.question_count or (select count(distinct q->>'id') from jsonb_array_elements(p_questions)q)<>a.question_count then raise exception 'Provide each existing question exactly once.'; end if;
 content_locked:=now()>=a.opens_at or exists(select 1 from public.teacher_assignment_attempts where assignment_id=a.id);
 for item in select * from jsonb_array_elements(p_questions) loop
  select * into old from public.teacher_assignment_questions where id=(item->>'id')::uuid and assignment_id=a.id;
  if not found then raise exception 'Question does not belong to this assignment.'; end if;
  if (item->>'seconds')::int not between 0 and 3600 then raise exception 'Question seconds must be between 0 and 3600.'; end if;
  if content_locked and (item->>'question_text' is distinct from old.question_text or item->>'option_a' is distinct from old.option_a or item->>'option_b' is distinct from old.option_b or item->>'option_c' is distinct from old.option_c or item->>'option_d' is distinct from old.option_d or item->>'correct_answer' is distinct from old.correct_answer or item->>'explanation' is distinct from old.explanation) then raise exception 'Question content is locked after the assignment opens. Duplicate it to change questions.'; end if;
  if length(trim(coalesce(item->>'question_text','')))=0 then raise exception 'Question text is required.'; end if;
  update public.teacher_assignment_questions set question_text=item->>'question_text',option_a=item->>'option_a',option_b=item->>'option_b',option_c=item->>'option_c',option_d=item->>'option_d',correct_answer=item->>'correct_answer',explanation=item->>'explanation',source_metadata=source_metadata||jsonb_build_object('time_limit_seconds',(item->>'seconds')::int) where id=old.id;
 end loop;
 if length(trim(coalesce(p_settings->>'title','')))=0 or (p_settings->>'closes_at')::timestamptz<=(p_settings->>'opens_at')::timestamptz or (p_settings->>'duration_minutes')::int not between 1 and 180 then raise exception 'Check title, dates and overall time allowed.'; end if;
 update public.teacher_assignments set title=p_settings->>'title',instructions=p_settings->>'instructions',target_group=nullif(p_settings->>'target_group',''),duration_minutes=(p_settings->>'duration_minutes')::int,opens_at=(p_settings->>'opens_at')::timestamptz,closes_at=(p_settings->>'closes_at')::timestamptz,max_attempts=(p_settings->>'max_attempts')::int,pass_mark=(p_settings->>'pass_mark')::int,feedback_mode=p_settings->>'feedback_mode',show_leaderboard=(p_settings->>'show_leaderboard')::boolean,updated_at=clock_timestamp() where id=a.id;
 return a.id;
end $$;
revoke all on function public.edit_teacher_assignment(uuid,uuid,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.edit_teacher_assignment(uuid,uuid,timestamptz,jsonb,jsonb) to service_role;
