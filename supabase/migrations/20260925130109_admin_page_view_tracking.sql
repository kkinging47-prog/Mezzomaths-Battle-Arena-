-- Authenticated page visits for admin audience reporting.
create table if not exists public.app_page_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_key text not null check (length(page_key) between 1 and 60),
  occurred_at timestamptz not null default now()
);
create index if not exists app_page_views_occurred_at_idx on public.app_page_views(occurred_at desc);
create index if not exists app_page_views_user_id_idx on public.app_page_views(user_id, occurred_at desc);
alter table public.app_page_views enable row level security;
revoke all on public.app_page_views from public, anon;
grant insert, select on public.app_page_views to authenticated;
grant usage, select on sequence public.app_page_views_id_seq to authenticated;
drop policy if exists "Users record own page visits" on public.app_page_views;
create policy "Users record own page visits" on public.app_page_views
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Admins read page visits" on public.app_page_views;
create policy "Admins read page visits" on public.app_page_views
for select to authenticated using ((select public.current_profile_role()) = 'admin');
