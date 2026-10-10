-- One official attempt per candidate per Sunday paper, including school-lab sittings.
alter table public.bece_sunday_weekly_claims
 add column if not exists session_data jsonb,
 add column if not exists result jsonb,
 add column if not exists school_id uuid references public.bece_sunday_schools(id),
 add column if not exists mode text not null default 'sunday';
create index if not exists bece_sunday_claim_school_idx on public.bece_sunday_weekly_claims(school_id,week_start);
-- An authenticated school owner may see only their own students' completed summary.
create or replace function public.bece_sunday_school_results()
returns table(candidate_id text,full_name text,class_level text,week_start date,score integer,total integer,topics jsonb,completed_at timestamptz)
language sql stable security definer set search_path=public as $$
 select c.candidate_id,st.full_name,st.class_level,c.week_start,
 (c.result->>'score')::integer,(c.result->>'total')::integer,c.result->'topics',c.completed_at
 from public.bece_sunday_weekly_claims c
 join public.bece_sunday_school_students st on st.candidate_id=c.candidate_id
 join public.bece_sunday_schools s on s.id=st.school_id
 where s.owner_id=auth.uid() and c.completed_at is not null
 order by c.week_start desc,st.full_name
$$;
revoke all on function public.bece_sunday_school_results() from public,anon;
grant execute on function public.bece_sunday_school_results() to authenticated;
-- Disable insecure anonymous writes of score/answers: server stores official results.
drop policy if exists "Public insert Sunday BECE attempts" on public.bece_sunday_trial_attempts;
revoke insert on public.bece_sunday_trial_attempts from anon,authenticated;

-- Public ranking returns only display fields, never contact details or answer data.
create or replace function public.bece_sunday_official_leaderboard(p_week_start date)
returns table(full_name text,school_name text,region text,score integer,total integer,week_start date)
language sql stable security definer set search_path=public as $$
 select r.full_name,r.school_name,r.region,(c.result->>'score')::integer,
 (c.result->>'total')::integer,c.week_start
 from public.bece_sunday_weekly_claims c
 join public.bece_sunday_trial_registrations r on r.candidate_id=c.candidate_id
 where c.week_start=p_week_start and c.completed_at is not null
 order by (c.result->>'score')::integer desc,c.completed_at asc limit 20
$$;
revoke all on function public.bece_sunday_official_leaderboard(date) from public;
grant execute on function public.bece_sunday_official_leaderboard(date) to anon,authenticated;
