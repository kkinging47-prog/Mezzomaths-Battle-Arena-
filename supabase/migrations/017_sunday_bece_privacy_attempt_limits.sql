-- Sunday BECE hardening: privacy-safe leaderboard, one attempt per week, and database rate limiting.
-- Run after migrations 015 and 016.

create extension if not exists pgcrypto;

-- 1) One official attempt per candidate contact per week.
create unique index if not exists bece_sunday_trial_one_contact_per_week_idx
  on public.bece_sunday_trial_attempts (week_start, lower(trim(contact)))
  where contact is not null and trim(contact) <> '';

-- 2) Keep private fields private. Public users should not read contacts, answers, or AI analysis from the base table.
alter table public.bece_sunday_trial_registrations enable row level security;
alter table public.bece_sunday_trial_attempts enable row level security;

drop policy if exists "Public read Sunday BECE leaderboard" on public.bece_sunday_trial_attempts;
drop policy if exists "Admins read Sunday BECE candidates" on public.bece_sunday_trial_registrations;
drop policy if exists "Trusted users read Sunday BECE candidates" on public.bece_sunday_trial_registrations;
drop policy if exists "Trusted users read full Sunday BECE attempts" on public.bece_sunday_trial_attempts;

create policy "Trusted users read Sunday BECE candidates"
  on public.bece_sunday_trial_registrations for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

create policy "Trusted users read full Sunday BECE attempts"
  on public.bece_sunday_trial_attempts for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

-- Keep public inserts possible for the free campaign. The unique index above prevents repeat weekly attempts.
drop policy if exists "Public insert Sunday BECE attempts" on public.bece_sunday_trial_attempts;
create policy "Public insert Sunday BECE attempts"
  on public.bece_sunday_trial_attempts for insert
  with check (true);

drop policy if exists "Public register Sunday BECE candidates" on public.bece_sunday_trial_registrations;
create policy "Public register Sunday BECE candidates"
  on public.bece_sunday_trial_registrations for insert
  with check (true);

-- 3) Privacy-safe public leaderboard view: no contact, answers, or AI analysis.
create or replace view public.bece_sunday_trial_public_leaderboard as
select
  id,
  week_start,
  full_name,
  school_name,
  region,
  score,
  total,
  percent,
  time_taken_seconds,
  created_at
from public.bece_sunday_trial_attempts;

grant select on public.bece_sunday_trial_public_leaderboard to anon, authenticated;

-- RPC version for the app: returns only safe leaderboard fields.
create or replace function public.get_bece_sunday_public_leaderboard(
  p_week_start date default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  week_start date,
  full_name text,
  school_name text,
  region text,
  score integer,
  total integer,
  percent numeric,
  time_taken_seconds integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.week_start,
    a.full_name,
    a.school_name,
    a.region,
    a.score,
    a.total,
    a.percent,
    a.time_taken_seconds,
    a.created_at
  from public.bece_sunday_trial_attempts a
  where a.week_start = coalesce(p_week_start, date_trunc('week', now())::date)
  order by a.score desc, a.time_taken_seconds asc nulls last, a.created_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

grant execute on function public.get_bece_sunday_public_leaderboard(date, integer) to anon, authenticated;

-- Contact-specific duplicate check. It returns only true/false, not private attempt details.
create or replace function public.has_bece_sunday_attempt(
  p_contact text,
  p_week_start date default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bece_sunday_trial_attempts a
    where lower(trim(a.contact)) = lower(trim(coalesce(p_contact, '')))
      and a.week_start = coalesce(p_week_start, date_trunc('week', now())::date)
  );
$$;

grant execute on function public.has_bece_sunday_attempt(text, date) to anon, authenticated;

-- 4) Database-backed rate limiting for public signup/campaign actions.
create table if not exists public.public_rate_limits (
  action text not null,
  client_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (action, client_hash, window_start)
);

alter table public.public_rate_limits enable row level security;

-- No public table read/write policies are granted. Access happens only through the security definer function.
create or replace function public.consume_public_rate_limit(
  p_action text,
  p_client_key text,
  p_max_attempts integer default 6,
  p_window_minutes integer default 15
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_action text := left(lower(regexp_replace(coalesce(p_action, 'general'), '[^a-z0-9_-]+', '_', 'g')), 80);
  clean_key text := coalesce(nullif(trim(p_client_key), ''), 'unknown');
  window_seconds integer := greatest(coalesce(p_window_minutes, 15), 1) * 60;
  bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  new_attempts integer;
begin
  insert into public.public_rate_limits(action, client_hash, window_start, attempts, updated_at)
  values (clean_action, encode(digest(lower(clean_key), 'sha256'), 'hex'), bucket, 1, now())
  on conflict (action, client_hash, window_start)
  do update set attempts = public.public_rate_limits.attempts + 1,
                updated_at = now()
  returning attempts into new_attempts;

  delete from public.public_rate_limits
  where updated_at < now() - interval '2 days';

  return new_attempts <= greatest(coalesce(p_max_attempts, 6), 1);
end;
$$;

grant execute on function public.consume_public_rate_limit(text, text, integer, integer) to anon, authenticated, service_role;
