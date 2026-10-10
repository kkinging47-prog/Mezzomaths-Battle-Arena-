-- School-managed Sunday BECE candidate roster.
create table if not exists public.bece_sunday_schools (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 school_name text not null,
 location text not null,
 region text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.bece_sunday_school_students (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.bece_sunday_schools(id) on delete cascade,
 candidate_id text not null unique,
 full_name text not null,
 class_level text not null,
 student_reference text not null,
 created_at timestamptz not null default now(),
 unique(school_id, student_reference)
);
alter table public.bece_sunday_schools enable row level security;
alter table public.bece_sunday_school_students enable row level security;
create policy "School owner reads school" on public.bece_sunday_schools
 for select to authenticated using(owner_id=auth.uid());
create policy "School owner creates school" on public.bece_sunday_schools
 for insert to authenticated with check(owner_id=auth.uid());
create policy "School owner reads roster" on public.bece_sunday_school_students
 for select to authenticated using(exists(select 1 from public.bece_sunday_schools s where s.id=school_id and s.owner_id=auth.uid()));
create policy "School owner creates roster" on public.bece_sunday_school_students
 for insert to authenticated with check(exists(select 1 from public.bece_sunday_schools s where s.id=school_id and s.owner_id=auth.uid()));
-- A student ID is stable and unique within the school; no password is stored on student records.
create index if not exists bece_sunday_roster_class_idx on public.bece_sunday_school_students(school_id,class_level);
