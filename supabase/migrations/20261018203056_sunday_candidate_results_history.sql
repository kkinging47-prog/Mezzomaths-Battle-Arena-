create or replace function public.sunday_candidate_history(p_candidate_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare identity text; payload jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
 select public.sunday_identity_key(full_name,contact) into identity from public.bece_sunday_trial_registrations where candidate_id=p_candidate_id;
 if identity is null then raise exception 'Candidate not found'; end if;
 with submitted as (
 select c.*,r.full_name,public.sunday_identity_key(r.full_name,r.contact) as identity_key,
 (c.result->>'score')::numeric as score, (c.result->>'total')::numeric as total,
 greatest(0,coalesce((c.result->>'time_taken_seconds')::integer,floor(extract(epoch from(c.completed_at-c.claimed_at)))::integer)) as elapsed
 from public.bece_sunday_weekly_claims c join public.bece_sunday_trial_registrations r using(candidate_id)
 where c.mode='sunday' and c.completed_at is not null and (c.result->>'total')::numeric>0
 ), ranked as (
 select *, row_number() over(partition by week_start order by score desc,elapsed,completed_at,candidate_id) as weekly_rank,
 count(*) over(partition by week_start) as weekly_candidates from submitted
 ), first_week as (
 select distinct on(identity_key,week_start) * from ranked order by identity_key,week_start,completed_at,candidate_id
 ), averages as (
 select identity_key,count(*) as completed_weeks,sum(score) as total_score,sum(total) as total_possible,
 avg(score) as average_score,avg(100*score/total) as average_percent,avg(elapsed) as average_time
 from first_week group by identity_key
 ), overall as (
 select *,row_number() over(order by average_percent desc,average_time,identity_key) as overall_rank,count(*) over() as ranked_candidates from averages
 )
 select jsonb_build_object('summary',(select to_jsonb(o)-'identity_key' from overall o where identity_key=identity),
 'weeks',coalesce((select jsonb_agg(jsonb_build_object('week_start',week_start,'candidate_id',candidate_id,'score',score,'total',total,'time_taken_seconds',elapsed,'weekly_rank',weekly_rank,'weekly_candidates',weekly_candidates,'completed_at',completed_at,'session_token',session_token,'session_data',session_data,'result',result) order by week_start desc) from first_week where identity_key=identity),'[]'::jsonb)) into payload;
 return payload;
end $$;
revoke all on function public.sunday_candidate_history(text) from public,anon,authenticated;
grant execute on function public.sunday_candidate_history(text) to service_role;
