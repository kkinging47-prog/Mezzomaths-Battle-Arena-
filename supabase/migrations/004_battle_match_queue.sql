create table if not exists public.battle_match_queue (
  id uuid primary key default gen_random_uuid(),
  client_id text unique not null,
  match_key text not null,
  student_name text,
  class_level text,
  curriculum text,
  topic text,
  status text default 'waiting' check (status in ('waiting','matched','expired')),
  updated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '45 seconds'),
  created_at timestamptz default now()
);

create index if not exists battle_match_queue_match_key_idx on public.battle_match_queue(match_key, status, expires_at);

alter table public.battle_match_queue enable row level security;

drop policy if exists "Public can join matchmaking queue" on public.battle_match_queue;
create policy "Public can join matchmaking queue"
  on public.battle_match_queue
  for insert
  with check (true);

drop policy if exists "Public can read waiting matchmaking queue" on public.battle_match_queue;
create policy "Public can read waiting matchmaking queue"
  on public.battle_match_queue
  for select
  using (true);

drop policy if exists "Public can update own matchmaking row" on public.battle_match_queue;
create policy "Public can update own matchmaking row"
  on public.battle_match_queue
  for update
  using (true)
  with check (true);
