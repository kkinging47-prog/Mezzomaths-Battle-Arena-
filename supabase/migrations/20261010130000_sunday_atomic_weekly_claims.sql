-- Atomic once-per-week claims across devices; server-only access.
create table if not exists public.bece_sunday_weekly_claims (
 candidate_id text not null,
 week_start date not null,
 claimed_at timestamptz not null default now(),
 completed_at timestamptz,
 primary key (candidate_id, week_start)
);
alter table public.bece_sunday_weekly_claims enable row level security;
revoke all on public.bece_sunday_weekly_claims from anon, authenticated;
grant select,insert,update on public.bece_sunday_weekly_claims to service_role;

create or replace function public.claim_bece_sunday_week(p_candidate_id text, p_week_start date)
returns boolean language plpgsql security definer set search_path=public as $$
declare claimed integer;
begin
 if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
   raise exception 'Service role required';
 end if;
 if not exists (select 1 from public.bece_sunday_trial_registrations where candidate_id=p_candidate_id) then
   raise exception 'Candidate not registered';
 end if;
 insert into public.bece_sunday_weekly_claims(candidate_id,week_start)
 values(p_candidate_id,p_week_start) on conflict do nothing;
 get diagnostics claimed = row_count;
 return claimed=1;
end $$;
revoke all on function public.claim_bece_sunday_week(text,date) from public,anon,authenticated;
grant execute on function public.claim_bece_sunday_week(text,date) to service_role;
