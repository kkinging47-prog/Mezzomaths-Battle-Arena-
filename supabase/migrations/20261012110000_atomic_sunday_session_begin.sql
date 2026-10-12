-- Phase 2: reserve the weekly attempt and its signed session in one transaction.
-- Run in Supabase SQL Editor before deploying the corresponding API update.
create or replace function public.begin_bece_sunday_session(
  p_candidate_id text, p_week_start date, p_session_token text,
  p_session_expires_at timestamptz, p_school_id uuid, p_mode text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare existing public.bece_sunday_weekly_claims%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if p_candidate_id is null or p_week_start is null or
     length(coalesce(p_session_token,'')) < 40 or
     p_session_expires_at <= now() or
     p_mode not in ('sunday','school_lab') then
    raise exception 'Invalid examination session';
  end if;
  if not exists(select 1 from public.bece_sunday_trial_registrations
                where candidate_id = p_candidate_id) then
    raise exception 'Candidate not registered';
  end if;
  insert into public.bece_sunday_weekly_claims
    (candidate_id,week_start,session_token,session_expires_at,school_id,mode)
  values (p_candidate_id,p_week_start,p_session_token,p_session_expires_at,p_school_id,p_mode)
  on conflict (candidate_id,week_start) do nothing;
  if found then return true; end if;
  -- A previously failed two-step start may have left an empty reservation.
  -- Lock it so only one request can recover it.
  select * into existing from public.bece_sunday_weekly_claims
   where candidate_id=p_candidate_id and week_start=p_week_start for update;
  if existing.completed_at is not null or existing.session_token is not null then
    return false;
  end if;
  update public.bece_sunday_weekly_claims
   set session_token=p_session_token,session_expires_at=p_session_expires_at,
       school_id=p_school_id,mode=p_mode
   where candidate_id=p_candidate_id and week_start=p_week_start
     and completed_at is null and session_token is null;
  return found;
end $$;
revoke all on function public.begin_bece_sunday_session(text,date,text,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_bece_sunday_session(text,date,text,timestamptz,uuid,text) to service_role;
