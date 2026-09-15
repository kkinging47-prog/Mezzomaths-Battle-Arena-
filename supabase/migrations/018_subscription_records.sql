-- Database-backed subscription records for verified Paystack payments.
-- Run after migration 016.

create extension if not exists pgcrypto;

create table if not exists public.subscription_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  reference text not null unique,
  plan_id text not null,
  plan_name text not null,
  category text not null default 'individual',
  student_range text,
  amount numeric(12,2) not null,
  currency text not null default 'GHS',
  status text not null default 'active',
  paid_at timestamptz,
  expires_at timestamptz,
  raw_transaction jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscription_records_email_status_idx
  on public.subscription_records (lower(email), status, expires_at desc);

create index if not exists subscription_records_user_status_idx
  on public.subscription_records (user_id, status, expires_at desc);

alter table public.subscription_records enable row level security;

drop policy if exists "Users read own subscriptions" on public.subscription_records;
drop policy if exists "Trusted users read all subscriptions" on public.subscription_records;

create policy "Users read own subscriptions"
  on public.subscription_records for select
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Trusted users read all subscriptions"
  on public.subscription_records for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','mezzo_staff')
    )
  );

-- Writes should come from the server/API using the service role key after Paystack verification.
create or replace view public.active_subscription_summary as
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
