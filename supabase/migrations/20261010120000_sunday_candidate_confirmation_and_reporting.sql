-- Sunday BECE registration confirmation, privacy, and school/region reporting.
alter table public.bece_sunday_trial_registrations
  add column if not exists candidate_id text;
create unique index if not exists bece_sunday_candidate_id_unique
  on public.bece_sunday_trial_registrations(candidate_id)
  where candidate_id is not null;
create index if not exists bece_sunday_reg_school_region_idx
  on public.bece_sunday_trial_registrations(school_name, region);

-- Registration details must never be readable anonymously.
drop policy if exists "Admins read Sunday BECE candidates"
  on public.bece_sunday_trial_registrations;
create policy "Admins read Sunday BECE candidates"
  on public.bece_sunday_trial_registrations for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'admin'
  ));

-- Admin-only aggregate statistics (no student contact details returned).
create or replace function public.bece_sunday_admin_registration_summary()
returns table (school_name text, region text, registered bigint)
language sql stable security definer set search_path = public
as $$
  select r.school_name, r.region, count(*)::bigint
  from public.bece_sunday_trial_registrations r
  where exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role) = 'admin'
  )
  group by r.school_name, r.region
  order by count(*) desc, r.school_name;
$$;
revoke all on function public.bece_sunday_admin_registration_summary() from public, anon;
grant execute on function public.bece_sunday_admin_registration_summary() to authenticated;
