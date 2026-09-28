-- Sunday set answers must be returned only by the server after full submission.
-- General published BECE practice remains public; assigned Sunday questions are excluded.
drop policy if exists "Anonymous read published BECE questions" on public.bece_question_bank;
create policy "Anonymous read published BECE questions"
  on public.bece_question_bank for select to anon
  using (status = 'Published' and sunday_set_id is null);

drop policy if exists "Authenticated read published or assigned BECE questions" on public.bece_question_bank;
create policy "Authenticated read published or assigned BECE questions"
  on public.bece_question_bank for select to authenticated
  using ((status = 'Published' and sunday_set_id is null) or (select public.can_manage_sunday_bece_questions()));
