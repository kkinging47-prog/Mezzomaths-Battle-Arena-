drop function public.bece_sunday_official_leaderboard(date);
create function public.bece_sunday_official_leaderboard(p_week_start date)
returns table(full_name text,school_name text,region text,score integer,total integer,week_start date,time_taken_seconds integer)
language sql stable security definer set search_path to 'public'
as $function$
 select r.full_name,r.school_name,r.region,(c.result->>'score')::integer,
 (c.result->>'total')::integer,c.week_start,
 greatest(0,coalesce((c.result->>'time_taken_seconds')::integer,
 floor(extract(epoch from (c.completed_at-c.claimed_at)))::integer)) as time_taken_seconds
 from public.bece_sunday_weekly_claims c
 join public.bece_sunday_trial_registrations r on r.candidate_id=c.candidate_id
 where c.week_start=p_week_start and c.completed_at is not null
 order by (c.result->>'score')::integer desc,
 greatest(0,coalesce((c.result->>'time_taken_seconds')::integer,
 floor(extract(epoch from (c.completed_at-c.claimed_at)))::integer)) asc,
 c.completed_at asc,c.candidate_id asc limit 20
$function$;
revoke all on function public.bece_sunday_official_leaderboard(date) from public;
grant execute on function public.bece_sunday_official_leaderboard(date) to anon,authenticated,service_role;
