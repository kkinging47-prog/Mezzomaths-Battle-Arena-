-- Give administrators read access to learner practice data for aggregate reports.
-- Students retain their existing owner-only access; no write access is added.
drop policy if exists "Admins read practice sessions for reporting" on public.practice_sessions;
create policy "Admins read practice sessions for reporting"
on public.practice_sessions for select to authenticated
using ((select public.current_profile_role()) = 'admin');
