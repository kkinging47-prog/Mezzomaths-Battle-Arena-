-- One official attempt per candidate per Sunday paper, including school-lab sittings.
alter table public.bece_sunday_weekly_claims
 add column if not exists session_data jsonb,
 add column if not exists result jsonb,
 add column if not exists school_id uuid references public.bece_sunday_schools(id),
 add column if not exists mode text not null default 'sunday';
create index if not exists bece_sunday_claim_school_idx on public.bece_sunday_weekly_claims(school_id,week_start);
-- An authenticated school owner may see only their own students' completed summary.
create or replace function public.bece_sunday_school_results()
returns table(candidate_id text,full_name text,class_level text,week_start date,score integer,total integer,completed_at timestamptz)
language sql stable security definer set search_path=public as $$
 select c.candidate_id,st.full_name,st.class_level,c.week_start,
 (c.result->>'score')::integer,(c.result->>'total')::integer,c.completed_at
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
