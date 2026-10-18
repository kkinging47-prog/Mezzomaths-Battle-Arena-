-- Preserve all historical registrations, sessions and results.
create or replace function public.sunday_identity_key(p_name text,p_contact text)
returns text language sql immutable set search_path=public as $$
 select md5(regexp_replace(lower(trim(coalesce(p_name,''))),'[^[:alnum:]]','','g') || '|' ||
 case when position('@' in p_contact)>0 or p_contact like 'school:%'
 then lower(regexp_replace(trim(p_contact),'[[:space:]]','','g'))
 else regexp_replace(regexp_replace(regexp_replace(p_contact,'[^0-9]','','g'),'^00233','233'),'^0','233') end)
$$;
revoke all on function public.sunday_identity_key(text,text) from public,anon,authenticated;
grant execute on function public.sunday_identity_key(text,text) to service_role;

create index if not exists sunday_registration_identity_idx on public.bece_sunday_trial_registrations(public.sunday_identity_key(full_name,contact));

create table public.bece_sunday_identity_claims (
 identity_key text not null, week_start date not null, mode text not null,
 candidate_id text not null, primary key(identity_key,week_start,mode)
);
alter table public.bece_sunday_identity_claims enable row level security;
revoke all on public.bece_sunday_identity_claims from public,anon,authenticated;
grant all on public.bece_sunday_identity_claims to service_role;
create policy "Service manages Sunday identity claims" on public.bece_sunday_identity_claims for all to service_role using(true) with check(true);
-- Seed a separate guard; never modify old claim rows, scores or rankings.
insert into public.bece_sunday_identity_claims(identity_key,week_start,mode,candidate_id)
select distinct on(public.sunday_identity_key(r.full_name,r.contact),c.week_start,c.mode)
 public.sunday_identity_key(r.full_name,r.contact),c.week_start,c.mode,c.candidate_id
from public.bece_sunday_weekly_claims c join public.bece_sunday_trial_registrations r using(candidate_id)
order by public.sunday_identity_key(r.full_name,r.contact),c.week_start,c.mode,c.claimed_at;

create or replace function public.guard_sunday_identity_claim()
returns trigger language plpgsql security definer set search_path=public as $$
declare identity text; owner_candidate text;
begin
 select public.sunday_identity_key(full_name,contact) into identity from public.bece_sunday_trial_registrations where candidate_id=new.candidate_id;
 if identity is null then raise exception 'Candidate not registered'; end if;
 insert into public.bece_sunday_identity_claims values(identity,new.week_start,new.mode,new.candidate_id) on conflict do nothing;
 select candidate_id into owner_candidate from public.bece_sunday_identity_claims where identity_key=identity and week_start=new.week_start and mode=new.mode;
 if owner_candidate<>new.candidate_id then raise unique_violation using message='This student already has a weekly examination session. Use the original candidate profile.'; end if;
 return new;
end $$;
revoke all on function public.guard_sunday_identity_claim() from public,anon,authenticated;
create trigger sunday_identity_claim_guard before insert on public.bece_sunday_weekly_claims for each row execute function public.guard_sunday_identity_claim();

create or replace function public.guard_sunday_registration_identity()
returns trigger language plpgsql security definer set search_path=public as $$
declare identity text;
begin
 identity:=public.sunday_identity_key(new.full_name,new.contact);
 perform pg_advisory_xact_lock(hashtextextended(identity,0));
 if tg_op='UPDATE' and public.sunday_identity_key(old.full_name,old.contact) is distinct from identity then
   raise exception 'Candidate identity cannot be changed. Contact support.';
 end if;
 if tg_op='INSERT' and exists(select 1 from public.bece_sunday_trial_registrations where public.sunday_identity_key(full_name,contact)=identity and candidate_id is not null) then
   raise unique_violation using message='Already registered. Restore the existing candidate profile.';
 end if;
 return new;
end $$;
revoke all on function public.guard_sunday_registration_identity() from public,anon,authenticated;
create trigger sunday_registration_identity_guard before insert or update of full_name,contact on public.bece_sunday_trial_registrations for each row execute function public.guard_sunday_registration_identity();

create or replace function public.register_or_recover_sunday_candidate(p_details jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.bece_sunday_trial_registrations%rowtype; identity text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
 if length(trim(coalesce(p_details->>'full_name','')))<3 or length(trim(coalesce(p_details->>'contact','')))<5 then raise exception 'Name and contact required'; end if;
 identity:=public.sunday_identity_key(p_details->>'full_name',p_details->>'contact');
 perform pg_advisory_xact_lock(hashtextextended(identity,0));
 select * into r from public.bece_sunday_trial_registrations x
 where public.sunday_identity_key(x.full_name,x.contact)=identity and x.candidate_id is not null
 order by x.created_at,x.id limit 1;
 if not found then
 if coalesce((p_details->>'recover_only')::boolean,false) then raise exception 'Registration not found'; end if;
 insert into public.bece_sunday_trial_registrations(candidate_id,full_name,contact,school_name,location,region,class_level)
 values('MSB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),trim(p_details->>'full_name'),trim(p_details->>'contact'),trim(p_details->>'school_name'),trim(p_details->>'location'),p_details->>'region',coalesce(p_details->>'class_level','Grade 9')) returning * into r;
 end if;
 return jsonb_build_object('candidate_id',r.candidate_id,'full_name',r.full_name,'contact',r.contact,'school_name',r.school_name,'location',r.location,'region',r.region,'class_level',r.class_level,'registration_status','confirmed');
end $$;
revoke all on function public.register_or_recover_sunday_candidate(jsonb) from public,anon,authenticated;
grant execute on function public.register_or_recover_sunday_candidate(jsonb) to service_role;

create or replace function public.sunday_duplicate_registration_report(p_week_start date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or public.current_profile_role() is distinct from 'admin' then raise exception 'Admin required'; end if;
 select coalesce(jsonb_agg(row_to_json(d)),'[]'::jsonb) into result from (
 select min(trim(r.full_name)) as full_name,count(distinct r.candidate_id) as candidate_ids,
 count(distinct c.candidate_id) as started_sessions,
 count(distinct c.candidate_id) filter(where c.completed_at is not null) as submissions
 from public.bece_sunday_trial_registrations r left join public.bece_sunday_weekly_claims c
 on c.candidate_id=r.candidate_id and c.week_start=p_week_start and c.mode='sunday'
 group by public.sunday_identity_key(r.full_name,r.contact)
 having count(distinct r.candidate_id)>1
 order by count(distinct c.candidate_id) desc,min(r.full_name)
 ) d;
 return result;
end $$;
revoke all on function public.sunday_duplicate_registration_report(date) from public,anon;
grant execute on function public.sunday_duplicate_registration_report(date) to authenticated;

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
exception when unique_violation then
  return false;
end $$;
revoke all on function public.begin_bece_sunday_session(text,date,text,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_bece_sunday_session(text,date,text,timestamptz,uuid,text) to service_role;
