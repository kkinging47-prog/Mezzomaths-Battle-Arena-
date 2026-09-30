create or replace function public.submit_lesson_homework(p_course_id uuid,p_chapter integer,p_lesson integer,p_response text)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_lesson jsonb; v_due timestamptz;
begin
 if v_user is null then raise exception 'Sign in to submit homework.'; end if;
 if not exists(select 1 from public.course_enrollments where course_id=p_course_id and student_id=v_user) then raise exception 'Enrol in this course first.'; end if;
 if p_chapter<0 or p_lesson<0 then raise exception 'Invalid lesson.'; end if;
 select content->'chapters'->p_chapter->'lessons'->p_lesson into v_lesson from public.course_content where course_id=p_course_id;
 if v_lesson is null or coalesce(v_lesson->>'homework','')='' then raise exception 'This lesson has no homework.'; end if;
 v_due := nullif(v_lesson->>'homework_due','')::timestamptz;
 if v_due is not null and now()>v_due then raise exception 'The homework deadline has passed.'; end if;
 if length(trim(coalesce(p_response,'')))=0 or length(p_response)>12000 then raise exception 'Enter an answer up to 12,000 characters.'; end if;
 insert into public.course_lesson_homework(course_id,student_id,chapter_index,lesson_index,response)
 values(p_course_id,v_user,p_chapter,p_lesson,trim(p_response))
 on conflict(course_id,student_id,chapter_index,lesson_index) do update set response=excluded.response,submitted_at=now();
end; $$;
revoke execute on function public.submit_lesson_homework(uuid,integer,integer,text) from public,anon;
grant execute on function public.submit_lesson_homework(uuid,integer,integer,text) to authenticated;
