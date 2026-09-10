-- Persistent login/profile details for live launch.
-- Run this after migrations 013 and 014.
-- Important: passwords are stored only by Supabase Auth, never in public.profiles.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists region text,
  add column if not exists last_login_at timestamptz,
  add column if not exists login_count integer default 0,
  add column if not exists profile_source text default 'supabase_auth',
  add column if not exists updated_at timestamptz default now();

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','teacher','mezzo_staff','admin'));

alter table public.profiles
  drop constraint if exists profiles_class_level_check;

alter table public.profiles
  add constraint profiles_class_level_check
  check (class_level is null or class_level in ('KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','JHS 1','JHS 2','JHS 3','Basic 7','Basic 8','Basic 9','SHS 1','SHS 2','SHS 3'));

create or replace function public.safe_live_role(requested_role text, user_email text)
returns text
language sql
stable
as $$
  select case
    when lower(coalesce(requested_role, 'student')) = 'admin'
      and lower(coalesce(user_email, '')) in ('hayfordevans@gmail.com','admin@admin.com') then 'admin'
    when lower(coalesce(requested_role, 'student')) in ('student','teacher','mezzo_staff') then lower(coalesce(requested_role, 'student'))
    else 'student'
  end;
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  dob date := null;
  computed_age integer := null;
  clean_email text := lower(coalesce(new.email, meta->>'email', ''));
begin
  if (meta ? 'date_of_birth') and (meta->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then
    dob := (meta->>'date_of_birth')::date;
    computed_age := date_part('year', age(current_date, dob))::integer;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    date_of_birth,
    age,
    school_name,
    location,
    class_level,
    curriculum,
    role,
    phone_number,
    region,
    avatar_url,
    created_at,
    updated_at,
    last_login_at,
    login_count,
    profile_source
  ) values (
    new.id,
    coalesce(nullif(meta->>'full_name',''), nullif(meta->>'name',''), split_part(clean_email, '@', 1), 'Mezzo User'),
    clean_email,
    dob,
    computed_age,
    coalesce(nullif(meta->>'school_name',''), nullif(meta->>'school',''), ''),
    coalesce(nullif(meta->>'location',''), ''),
    coalesce(nullif(meta->>'class_level',''), 'Grade 4'),
    coalesce(nullif(meta->>'curriculum',''), 'GES'),
    public.safe_live_role(meta->>'role', clean_email),
    coalesce(nullif(meta->>'phone_number',''), nullif(meta->>'phone',''), ''),
    coalesce(nullif(meta->>'region',''), ''),
    nullif(meta->>'avatar_url',''),
    now(),
    now(),
    now(),
    0,
    'auth_trigger'
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
    email = excluded.email,
    school_name = coalesce(nullif(excluded.school_name,''), public.profiles.school_name),
    location = coalesce(nullif(excluded.location,''), public.profiles.location),
    class_level = coalesce(nullif(excluded.class_level,''), public.profiles.class_level),
    curriculum = coalesce(nullif(excluded.curriculum,''), public.profiles.curriculum),
    role = public.safe_live_role(excluded.role, excluded.email),
    phone_number = coalesce(nullif(excluded.phone_number,''), public.profiles.phone_number),
    region = coalesce(nullif(excluded.region,''), public.profiles.region),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user_profile();

create or replace function public.touch_current_user_login()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  update public.profiles
  set last_login_at = now(),
      login_count = coalesce(login_count, 0) + 1,
      updated_at = now()
  where id = auth.uid()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.touch_current_user_login() to authenticated;
grant execute on function public.safe_live_role(text, text) to anon, authenticated;

-- Safer profile policies without self-recursion.
drop policy if exists "Profiles readable by owner or admin" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own or admin" on public.profiles;
drop policy if exists "Users read own profile only" on public.profiles;
drop policy if exists "Users insert own profile only" on public.profiles;
drop policy if exists "Users update own profile only" on public.profiles;

create policy "Users read own profile only"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users insert own profile only"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile only"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
