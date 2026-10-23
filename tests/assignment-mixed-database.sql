-- Run in a test database with at least one existing assignment owner. All fixtures roll back.
begin;
do $$ declare owner_id uuid; begin
 select teacher_id into owner_id from public.teacher_assignments limit 1;
 if owner_id is null then raise exception 'No owner for fixture'; end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare new_id uuid; begin
 new_id:=public.create_mixed_assignment(jsonb_build_object('code','MIXEDQA1','title','Rollback QA fixture','class_level','Year 5','curriculum','Cambridge','topic','Counting','duration_minutes',30,'opens_at',now()-interval '1 hour','closes_at',now()+interval '1 hour','assignment_type','homework','max_attempts',1,'pass_mark',50,'feedback_mode','after_submit'), '[{"question_text":"Half?","question_type":"number","correct_answer":"0.5","marks":2},{"question_text":"Explain","question_type":"reasoning","marking":"teacher_review","correct_answer":"Model answer","marks":3}]'::jsonb);
 perform set_config('qa.assignment_id',new_id::text,true);
end $$;
reset role;
do $$ declare aid uuid:=current_setting('qa.assignment_id')::uuid; owner_id uuid:=auth.uid(); receipt uuid:=gen_random_uuid(); result jsonb; retry jsonb; response_id uuid; begin
 result:=public.record_mixed_assignment(aid,'QA Test Learner','Year 5','QA School',receipt,12,'[{"position":1,"selected_answer":"1/2","correct_answer":"0.5","is_correct":true,"awarded_marks":2,"max_marks":2,"grading_status":"graded"},{"position":2,"selected_answer":"Reasoned working","correct_answer":"Model answer","is_correct":null,"awarded_marks":null,"max_marks":3,"grading_status":"pending"}]');
 if result->>'grading_status'<>'pending' or (result->>'score')::numeric<>2 or (result->>'total')::numeric<>5 then raise exception 'Incorrect provisional result'; end if;
 retry:=public.record_mixed_assignment(aid,'QA Test Learner','Year 5','QA School',receipt,12,'[]');
 if result->>'id'<>retry->>'id' then raise exception 'Duplicate retry'; end if;
 begin
  perform public.record_mixed_assignment(aid,'QA Test Learner','Year 5','QA School',gen_random_uuid(),12,'[]');
  raise exception 'Unexpected attempt limit bypass';
 exception when others then if sqlerrm not like 'Maximum attempts reached%' then raise; end if; end;
 select id into response_id from public.teacher_assignment_responses where attempt_id=(result->>'id')::uuid and question_position=2;
 begin
  perform public.grade_mixed_assignment(gen_random_uuid(),(result->>'id')::uuid,jsonb_build_array(jsonb_build_object('response_id',response_id,'marks',2)));
  raise exception 'Unexpected authorisation bypass';
 exception when others then if sqlerrm not like 'Not authorised%' then raise; end if; end;
 begin
  perform public.grade_mixed_assignment(owner_id,(result->>'id')::uuid,jsonb_build_array(jsonb_build_object('response_id',response_id,'marks',4)));
  raise exception 'Unexpected excess marks';
 exception when others then if sqlerrm not like 'Award between%' then raise; end if; end;
 result:=public.grade_mixed_assignment(owner_id,(result->>'id')::uuid,jsonb_build_array(jsonb_build_object('response_id',response_id,'marks',2.5,'feedback','Good reasoning')));
 if result->>'grading_status'<>'graded' or (result->>'score')::numeric<>4.5 or (result->>'percent')::numeric<>90 then raise exception 'Incorrect final result'; end if;
 if has_function_privilege('anon','public.record_mixed_assignment(uuid,text,text,text,uuid,integer,jsonb)','execute') or has_function_privilege('authenticated','public.grade_mixed_assignment(uuid,uuid,jsonb)','execute') then raise exception 'RPC privileges too broad'; end if;
 if has_column_privilege('anon','public.teacher_assignment_attempts','submission_key','select') then raise exception 'Receipt exposed'; end if;
end $$;
select 'PASS atomic publish, weighted marks, pending written work, duplicate retry, attempt limits, denied unauthorised marking, rejected excess marks, partial marking and receipt privacy; fixtures rolled back' as verification;
rollback;
