-- Only backend roles may finalise. Canonical stored tokens/answers are authoritative.
create or replace function public.finalize_expired_sunday_sessions(p_candidate_id text default null,p_week_start date default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 c record; payload jsonb; encoded text; ids jsonb; review jsonb; deadline timestamptz;
 started timestamptz; score integer; answered integer; processed integer:=0; skipped integer:=0;
begin
 for c in select * from public.bece_sunday_weekly_claims
  where mode='sunday' and week_start>=date '2026-11-08' and completed_at is null
   and session_expires_at<=now() and session_token is not null
   and (p_candidate_id is null or candidate_id=p_candidate_id)
   and (p_week_start is null or week_start=p_week_start)
  order by session_expires_at,candidate_id limit 200 for update skip locked
 loop
  begin
   encoded:=translate(split_part(c.session_token,'.',1),'-_','+/');
   encoded:=encoded||repeat('=',(4-length(encoded)%4)%4);
   payload:=convert_from(decode(encoded,'base64'),'UTF8')::jsonb;
   ids:=payload->'ids';
   if payload->>'candidateId' is distinct from c.candidate_id
    or payload->>'weekStart' is distinct from c.week_start::text
    or coalesce(payload->>'mode','sunday')<>'sunday'
    or coalesce((payload->>'preview')::boolean,false)
    or jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)<>40
    or (select count(distinct value) from jsonb_array_elements_text(ids))<>40
   then skipped:=skipped+1;continue;end if;
   started:=to_timestamp((payload->>'startedAt')::numeric/1000);
   deadline:=least(c.session_expires_at,to_timestamp((payload->>'expiresAt')::numeric/1000),started+interval '60 minutes');
   if started is null or deadline is null or deadline>now() or deadline<=started then skipped:=skipped+1;continue;end if;
   select jsonb_agg(jsonb_build_object(
    'id',q.id,'question_id',q.id,'question_text',q.question_text,'question_image_url',coalesce(q.question_image_url,''),
    'options',jsonb_build_array(q.option_a,q.option_b,q.option_c,q.option_d),
    'option_image_urls',jsonb_build_array(coalesce(q.option_a_image_url,''),coalesce(q.option_b_image_url,''),coalesce(q.option_c_image_url,''),coalesce(q.option_d_image_url,'')),
    'selected_answer',case when c.session_data->'selections'->>q.id::text ~ '^[ABCD]$' then c.session_data->'selections'->>q.id::text else '' end,
    'correct_answer',upper(left(trim(q.correct_answer),1)),
    'correct',coalesce((c.session_data->'selections'->>q.id::text)=upper(left(trim(q.correct_answer),1)),false),
    'topic',coalesce(q.topic,'General'),'topic_area',coalesce(q.topic_area,q.topic,'General'),
    'explanation',coalesce(q.explanation,'A worked explanation is awaiting editor review.')) order by x.ordinality)
    into review from jsonb_array_elements_text(ids) with ordinality x(id,ordinality)
    join public.bece_question_bank q on q.id=x.id::uuid;
   if review is null or jsonb_array_length(review)<>40 then skipped:=skipped+1;continue;end if;
   select count(*) filter(where (item->>'correct')::boolean),count(*) filter(where item->>'selected_answer'<>'')
    into score,answered from jsonb_array_elements(review) item;
   update public.bece_sunday_weekly_claims set completed_at=deadline,result=jsonb_build_object(
    'score',score,'total',40,'review',review,'topics','{}'::jsonb,
    'time_taken_seconds',floor(extract(epoch from(deadline-started)))::integer,
    'auto_submitted',true,'submission_reason','time_expired','auto_submitted_at',clock_timestamp(),'answered',answered)
    where candidate_id=c.candidate_id and week_start=c.week_start and completed_at is null;
   processed:=processed+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('processed',processed,'skipped',skipped);
end $$;
revoke all on function public.finalize_expired_sunday_sessions(text,date) from public,anon,authenticated;
grant execute on function public.finalize_expired_sunday_sessions(text,date) to service_role;

-- Runs inside Postgres even if every candidate browser has been closed.
create extension if not exists pg_cron;
create index if not exists bece_sunday_expiry_pending_idx
 on public.bece_sunday_weekly_claims(session_expires_at) where completed_at is null and mode='sunday';
select cron.schedule('sunday-bece-expiry-auto-submit','* * * * *','select public.finalize_expired_sunday_sessions();');
