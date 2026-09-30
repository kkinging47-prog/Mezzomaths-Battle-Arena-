-- Admin-managed course offers and learner access.
revoke all on public.course_coupons, public.course_access_grants from anon;
revoke all on public.course_purchases from anon;
grant select, insert on public.course_coupons, public.course_access_grants to authenticated;
grant select, insert on public.course_purchases to authenticated;

drop policy if exists "Consolidated anonymous read" on public.course_coupons;
drop policy if exists "Consolidated authenticated read" on public.course_coupons;
drop policy if exists "Consolidated anonymous read" on public.course_access_grants;
drop policy if exists "Consolidated authenticated read" on public.course_access_grants;
drop policy if exists "Everyone reads active coupons" on public.course_coupons;
create policy "Administrators read course coupons" on public.course_coupons
  for select to authenticated using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));
drop policy if exists "Students read own course grants" on public.course_access_grants;
create policy "Learners read own course grants" on public.course_access_grants
  for select to authenticated using (student_id = (select auth.uid()) or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create index if not exists course_access_grants_student_course_idx
  on public.course_access_grants (student_id, course_id);

-- Coupon codes are checked inside the database; clients cannot create purchases
-- or enrol in paid courses by writing directly to exposed tables.
create or replace function public.redeem_course_coupon(p_course_id uuid, p_code text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
begin
  if v_user is null then raise exception 'Sign in to redeem a coupon'; end if;
  if not exists (select 1 from public.course_sessions c where c.id = p_course_id and c.status = 'published') then
    raise exception 'Course is unavailable';
  end if;
  if not exists (
    select 1 from public.course_coupons cp
    where upper(cp.code) = upper(trim(p_code)) and cp.active
      and (cp.expires_at is null or cp.expires_at > now())
      and (cp.course_id is null or cp.course_id = p_course_id)
      and cp.discount_percent = 100
  ) then raise exception 'Invalid or ineligible coupon'; end if;
  select u.email into v_email from auth.users u where u.id = v_user;
  insert into public.course_enrollments (course_id, student_id, student_email, progress_snapshot)
    values (p_course_id, v_user, v_email, '{"completed":[],"quizScores":{},"finalScore":null}'::jsonb)
    on conflict (course_id, student_id) do nothing;
  insert into public.course_purchases (course_id, student_id, student_email, amount, currency, coupon_code, status, paid_at)
    select p_course_id, v_user, v_email, 0, 'GHS', upper(trim(p_code)), 'success', now()
    where not exists (select 1 from public.course_purchases x where x.course_id = p_course_id and x.student_id = v_user and x.status = 'success');
end;
$$;
revoke execute on function public.redeem_course_coupon(uuid,text) from public, anon;
grant execute on function public.redeem_course_coupon(uuid,text) to authenticated;
