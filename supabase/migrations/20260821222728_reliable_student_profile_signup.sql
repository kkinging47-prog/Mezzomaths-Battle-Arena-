-- Guarantee a safe student profile for every Supabase Auth user.

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    school_name,
    location,
    region,
    class_level,
    curriculum,
    academic_term,
    role,
    approval_status
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Mezzo User'
    ),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'school_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'location'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'region'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'class_level'), ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'curriculum'), ''), 'GES'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'academic_term'), ''), 'Term 1'),
    'student',
    'approved'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

-- Every self-created profile starts as an approved student. Privileged roles
-- must be assigned later by an existing administrator.
create or replace function public.protect_profile_role_and_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.role := 'student';
    new.approval_status := 'approved';
    new.approved_at := null;
    new.approved_by := null;
  elsif public.current_profile_role() <> 'admin' then
    new.role := old.role;
    new.approval_status := old.approval_status;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role_and_approval() from public, anon, authenticated;

-- Repair Auth users whose profile creation previously failed.
insert into public.profiles (
  id,
  full_name,
  email,
  school_name,
  location,
  region,
  class_level,
  curriculum,
  academic_term,
  role,
  approval_status
)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Mezzo User'
  ),
  u.email,
  nullif(btrim(u.raw_user_meta_data ->> 'school_name'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'location'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'region'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'class_level'), ''),
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'curriculum'), ''), 'GES'),
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'academic_term'), ''), 'Term 1'),
  'student',
  'approved'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
