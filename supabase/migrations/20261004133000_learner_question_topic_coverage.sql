create or replace function public.question_topic_coverage()
returns table(class_level text,curriculum text,topic text,question_count bigint,numeric_count bigint)
language sql stable security invoker set search_path='' as $$
 select q.class_level,q.curriculum,q.topic,count(*),count(q.numeric_answer)
 from public.question_bank q where q.is_active=true
 group by q.class_level,q.curriculum,q.topic order by q.class_level,q.curriculum,q.topic;
$$;
revoke all on function public.question_topic_coverage() from public;
grant execute on function public.question_topic_coverage() to anon,authenticated;
