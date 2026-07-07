-- Optional migration for AI-generated questions, maths symbols and image-based questions/options.

alter table public.question_bank
  add column if not exists question_image_url text,
  add column if not exists option_a_image_url text,
  add column if not exists option_b_image_url text,
  add column if not exists option_c_image_url text,
  add column if not exists option_d_image_url text,
  add column if not exists ai_generated boolean default false,
  add column if not exists ai_prompt text,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.ai_question_generations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  class_level text not null,
  curriculum text not null,
  topic text not null,
  question_count integer not null check (question_count in (10,20,30,40,50)),
  difficulty integer default 1,
  prompt text,
  status text default 'completed' check (status in ('draft','completed','failed')),
  created_at timestamptz default now()
);

alter table public.ai_question_generations enable row level security;

create policy "Admins manage AI question generations" on public.ai_question_generations
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
