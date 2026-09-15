-- Sunday BECE assigned editors only.
-- Admins can assign editors. Only admins and assigned active editors can add/edit/archive Sunday BECE questions.

create extension if not exists pgcrypto;

create table if not exists public.sunday_bece_question_editors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  notes text,
  assigned_by uuid references auth.users(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (email)
);

create unique index if not exists sunday_bece_question_editors_user_active_idx
  on public.sunday_bece_question_editors(user_id)
  where status = 'active' and user_id is not null;

alter table public.sunday_bece_question_editors enable row level security;

create or replace function public.is_sunday_bece_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.can_manage_sunday_bece_questions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sunday_bece_admin()
    or exists (
      select 1
      from public.sunday_bece_question_editors e
      where e.status = 'active'
        and (
          e.user_id = auth.uid()
          or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );
$$;

create or replace function public.assign_sunday_bece_question_editor(
  p_email text,
  p_notes text default null
)
returns public.sunday_bece_question_editors
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
  target_profile public.profiles;
  row public.sunday_bece_question_editors;
begin
  if not public.is_sunday_bece_admin() then
    raise exception 'Only admin users can assign Sunday BECE question editors.';
  end if;

  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'Enter a valid editor email address.';
  end if;

  select * into target_profile
  from public.profiles
  where lower(email) = clean_email
  limit 1;

  if target_profile.id is null then
    raise exception 'This editor must first create an account before assignment.';
  end if;

  insert into public.sunday_bece_question_editors (
    user_id, email, status, notes, assigned_by, assigned_at, revoked_by, revoked_at, updated_at
  ) values (
    target_profile.id, clean_email, 'active', p_notes, auth.uid(), now(), null, null, now()
  )
  on conflict (email) do update set
    user_id = excluded.user_id,
    status = 'active',
    notes = excluded.notes,
    assigned_by = auth.uid(),
    assigned_at = now(),
    revoked_by = null,
    revoked_at = null,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

create or replace function public.revoke_sunday_bece_question_editor(p_email text)
returns public.sunday_bece_question_editors
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
  row public.sunday_bece_question_editors;
begin
  if not public.is_sunday_bece_admin() then
    raise exception 'Only admin users can revoke Sunday BECE question editors.';
  end if;

  update public.sunday_bece_question_editors
  set status = 'revoked', revoked_by = auth.uid(), revoked_at = now(), updated_at = now()
  where lower(email) = clean_email
  returning * into row;

  if row.id is null then
    raise exception 'Editor assignment not found.';
  end if;

  return row;
end;
$$;

revoke all on function public.is_sunday_bece_admin() from public;
revoke all on function public.can_manage_sunday_bece_questions() from public;
revoke all on function public.assign_sunday_bece_question_editor(text, text) from public;
revoke all on function public.revoke_sunday_bece_question_editor(text) from public;

grant execute on function public.is_sunday_bece_admin() to authenticated;
grant execute on function public.can_manage_sunday_bece_questions() to authenticated;
grant execute on function public.assign_sunday_bece_question_editor(text, text) to authenticated;
grant execute on function public.revoke_sunday_bece_question_editor(text) to authenticated;

-- Editor assignment table policies.
drop policy if exists "Admins read Sunday BECE editors" on public.sunday_bece_question_editors;
drop policy if exists "Editors read own Sunday BECE assignment" on public.sunday_bece_question_editors;
drop policy if exists "Admins insert Sunday BECE editors" on public.sunday_bece_question_editors;
drop policy if exists "Admins update Sunday BECE editors" on public.sunday_bece_question_editors;
drop policy if exists "Admins delete Sunday BECE editors" on public.sunday_bece_question_editors;

create policy "Admins read Sunday BECE editors"
  on public.sunday_bece_question_editors for select
  to authenticated
  using (public.is_sunday_bece_admin());

create policy "Editors read own Sunday BECE assignment"
  on public.sunday_bece_question_editors for select
  to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Admins insert Sunday BECE editors"
  on public.sunday_bece_question_editors for insert
  to authenticated
  with check (public.is_sunday_bece_admin());

create policy "Admins update Sunday BECE editors"
  on public.sunday_bece_question_editors for update
  to authenticated
  using (public.is_sunday_bece_admin())
  with check (public.is_sunday_bece_admin());

create policy "Admins delete Sunday BECE editors"
  on public.sunday_bece_question_editors for delete
  to authenticated
  using (public.is_sunday_bece_admin());

-- Replace broad trusted editor policies. Teachers/Mezzo staff need explicit assignment before editing.
alter table public.bece_question_bank enable row level security;

drop policy if exists "Admins manage BECE questions insert" on public.bece_question_bank;
drop policy if exists "Admins manage BECE questions update" on public.bece_question_bank;
drop policy if exists "Admins manage BECE questions delete" on public.bece_question_bank;
drop policy if exists "Trusted editors manage BECE questions insert" on public.bece_question_bank;
drop policy if exists "Trusted editors manage BECE questions update" on public.bece_question_bank;
drop policy if exists "Trusted editors manage BECE questions delete" on public.bece_question_bank;
drop policy if exists "Authenticated read published BECE questions" on public.bece_question_bank;

create policy "Authenticated read published or assigned BECE questions"
  on public.bece_question_bank for select
  to authenticated
  using (status = 'Published' or public.can_manage_sunday_bece_questions());

create policy "Assigned Sunday BECE editors insert questions"
  on public.bece_question_bank for insert
  to authenticated
  with check (public.can_manage_sunday_bece_questions());

create policy "Assigned Sunday BECE editors update questions"
  on public.bece_question_bank for update
  to authenticated
  using (public.can_manage_sunday_bece_questions())
  with check (public.can_manage_sunday_bece_questions());

create policy "Assigned Sunday BECE editors delete questions"
  on public.bece_question_bank for delete
  to authenticated
  using (public.can_manage_sunday_bece_questions());

-- Storage permissions: only admin or assigned editors may upload/update/delete question images.
drop policy if exists "Trusted editors upload BECE question images" on storage.objects;
drop policy if exists "Trusted editors update BECE question images" on storage.objects;
drop policy if exists "Trusted editors delete BECE question images" on storage.objects;
drop policy if exists "Assigned Sunday BECE editors upload images" on storage.objects;
drop policy if exists "Assigned Sunday BECE editors update images" on storage.objects;
drop policy if exists "Assigned Sunday BECE editors delete images" on storage.objects;

create policy "Assigned Sunday BECE editors upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bece-question-images' and public.can_manage_sunday_bece_questions());

create policy "Assigned Sunday BECE editors update images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'bece-question-images' and public.can_manage_sunday_bece_questions())
  with check (bucket_id = 'bece-question-images' and public.can_manage_sunday_bece_questions());

create policy "Assigned Sunday BECE editors delete images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'bece-question-images' and public.can_manage_sunday_bece_questions());