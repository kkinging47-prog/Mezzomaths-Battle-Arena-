-- Keep Sunday BECE answer keys off learner browsers.
-- Published trial questions are now served through server-side Vercel endpoints.
-- Direct table reads remain available only to admins and explicitly assigned Sunday BECE editors.

alter table public.bece_question_bank enable row level security;

drop policy if exists "Authenticated read published or assigned BECE questions" on public.bece_question_bank;
drop policy if exists "Authenticated read published BECE questions" on public.bece_question_bank;
drop policy if exists "Public read published BECE questions" on public.bece_question_bank;
drop policy if exists "Anyone read published BECE questions" on public.bece_question_bank;
drop policy if exists "Anon read published BECE questions" on public.bece_question_bank;

create policy "Sunday BECE managers read question bank"
  on public.bece_question_bank for select
  to authenticated
  using (public.can_manage_sunday_bece_questions());
