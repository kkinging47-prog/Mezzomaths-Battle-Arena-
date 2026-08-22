drop policy if exists "Consolidated anonymous read"
on public.junior_questions;

create policy "Anonymous read published junior questions"
on public.junior_questions
for select
to anon
using (status = 'Published');

do $$
declare
  v_policy_count integer;
begin
  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'junior_questions'
    and cmd = 'SELECT'
    and 'anon' = any(roles)
    and qual = '(status = ''Published''::text)';

  if v_policy_count <> 1 then
    raise exception 'Expected one published-only anonymous Junior policy, found %',v_policy_count;
  end if;
end
$$;
