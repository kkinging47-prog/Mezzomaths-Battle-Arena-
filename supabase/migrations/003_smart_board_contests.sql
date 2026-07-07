-- Smart Board 1 vs 1 contest support.

alter table public.question_bank
  add column if not exists numeric_answer numeric;

create table if not exists public.smart_board_contests (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  class_level text,
  curriculum text,
  duration_seconds integer not null,
  student_a_name text not null,
  student_a_school text,
  student_a_class text,
  student_a_score integer default 0,
  student_b_name text not null,
  student_b_school text,
  student_b_class text,
  student_b_score integer default 0,
  winner_name text,
  winner_school text,
  winner_class text,
  winner_score integer default 0,
  runner_up_name text,
  runner_up_score integer default 0,
  created_at timestamptz default now()
);

alter table public.smart_board_contests enable row level security;

create policy "Users can read smart board contests" on public.smart_board_contests
for select using (true);

create policy "Admins can insert smart board contests" on public.smart_board_contests
for insert with check (true);
