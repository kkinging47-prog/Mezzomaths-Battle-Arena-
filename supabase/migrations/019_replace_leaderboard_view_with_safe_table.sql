-- Replace security-definer public views with safer tables/security-invoker views and reduce advisor warnings.
-- Run after migrations 017 and 018.

-- Public Sunday leaderboard becomes a sanitized table populated by trigger.
drop view if exists public.bece_sunday_trial_public_leaderboard;

create table if not exists public.bece_sunday_trial_public_leaderboard (
  id uuid primary key,
  week_start date not null,
  full_name text not null,
  school_name text,
  region text,
  score integer not null default 0,
  total integer not null default 40,
  percent numeric(5,2),
  time_taken_seconds integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.bece_sunday_trial_public_leaderboard (
  id, week_start, full_name, school_name, region, score, total, percent, time_taken_seconds, created_at, updated_at
)
select id, week_start, full_name, school_name, region, score, total, percent, time_taken_seconds, created_at, now()
from public.bece_sunday_trial_attempts
on conflict (id) do update set
  week_start = excluded.week_start,
  full_name = excluded.full_name,
  school_name = excluded.school_name,
  region = excluded.region,
  score = excluded.score,
  total = excluded.total,
  percent = excluded.percent,
  time_taken_seconds = excluded.time_taken_seconds,
  updated_at = now();

alter table public.bece_sunday_trial_public_leaderboard enable row level security;

drop policy if exists "Public read safe Sunday leaderboard" on public.bece_sunday_trial_public_leaderboard;
create policy "Public read safe Sunday leaderboard"
  on public.bece_sunday_trial_public_leaderboard for select
  using (true);

create or replace function public.sync_bece_sunday_public_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.bece_sunday_trial_public_leaderboard where id = old.id;
    return old;
  end if;

  insert into public.bece_sunday_trial_public_leaderboard (
    id, week_start, full_name, school_name, region, score, total, percent, time_taken_seconds, created_at, updated_at
  ) values (
    new.id, new.week_start, new.full_name, new.school_name, new.region, new.score, new.total, new.percent, new.time_taken_seconds, new.created_at, now()
  )
  on conflict (id) do update set
    week_start = excluded.week_start,
    full_name = excluded.full_name,
    school_name = excluded.school_name,
    region = excluded.region,
    score = excluded.score,
    total = excluded.total,
    percent = excluded.percent,
    time_taken_seconds = excluded.time_taken_seconds,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_bece_sunday_public_leaderboard_after_change on public.bece_sunday_trial_attempts;
create trigger sync_bece_sunday_public_leaderboard_after_change
  after insert or update or delete on public.bece_sunday_trial_attempts
  for each row execute function public.sync_bece_sunday_public_leaderboard();

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
stable
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
  from public.bece_sunday_trial_public_leaderboard a
  where a.week_start = coalesce(p_week_start, date_trunc('week', now())::date)
  order by a.score desc, a.time_taken_seconds asc nulls last, a.created_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

grant execute on function public.get_bece_sunday_public_leaderboard(date, integer) to anon, authenticated;

-- Active subscription summary should respect caller RLS, not bypass as view owner.
drop view if exists public.active_subscription_summary;
create view public.active_subscription_summary
with (security_invoker = true)
as
select
  email,
  max(expires_at) as active_until,
  count(*) filter (where status = 'active') as active_records,
  max(plan_name) as latest_plan_name,
  max(category) as latest_category
from public.subscription_records
where status = 'active'
  and (expires_at is null or expires_at > now())
group by email;

grant select on public.active_subscription_summary to authenticated;

-- Explicit deny policies avoid the "RLS enabled with no policy" lint while keeping rate-limit rows private.
drop policy if exists "No public read public rate limits" on public.public_rate_limits;
create policy "No public read public rate limits"
  on public.public_rate_limits for select
  using (false);

-- Harden supporting functions.
create or replace function public.safe_live_role(requested_role text, user_email text)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when lower(coalesce(requested_role, 'student')) = 'admin'
      and lower(coalesce(user_email, '')) in ('hayfordevans@gmail.com','admin@admin.com') then 'admin'
    when lower(coalesce(requested_role, 'student')) in ('student','teacher','mezzo_staff') then lower(coalesce(requested_role, 'student'))
    else 'student'
  end;
$$;

revoke execute on function public.touch_current_user_login() from anon;
grant execute on function public.touch_current_user_login() to authenticated;
