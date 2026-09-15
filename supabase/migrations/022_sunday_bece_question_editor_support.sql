-- Sunday BECE question editor support.
-- Adds metadata columns, allows trusted editors, and creates a public storage bucket for question images.

create extension if not exists pgcrypto;

alter table public.bece_question_bank
  add column if not exists topic_area text,
  add column if not exists source_name text default 'Sunday BECE Special',
  add column if not exists source_page text,
  add column if not exists math_format text default 'unicode',
  add column if not exists editor_notes text;

update public.bece_question_bank
set topic_area = coalesce(topic_area, curriculum_strand, topic),
    source_name = coalesce(source_name, 'Sunday BECE Special'),
    math_format = coalesce(math_format, 'unicode')
where topic_area is null or source_name is null or math_format is null;

alter table public.bece_question_bank enable row level security;

drop policy if exists "Admins manage BECE questions insert" on public.bece_question_bank;
drop policy if exists "Admins manage BECE questions update" on public.bece_question_bank;
drop policy if exists "Admins manage BECE questions delete" on public.bece_question_bank;
drop policy if exists "Trusted editors manage BECE questions insert" on public.bece_question_bank;
drop policy if exists "Trusted editors manage BECE questions update" on public.bece_question_bank;
drop policy if exists "Trusted editors manage BECE questions delete" on public.bece_question_bank;

create policy "Trusted editors manage BECE questions insert"
  on public.bece_question_bank for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

create policy "Trusted editors manage BECE questions update"
  on public.bece_question_bank for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

create policy "Trusted editors manage BECE questions delete"
  on public.bece_question_bank for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

-- Public bucket for images used in question stems and option diagrams.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bece-question-images',
  'bece-question-images',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read BECE question images" on storage.objects;
drop policy if exists "Trusted editors upload BECE question images" on storage.objects;
drop policy if exists "Trusted editors update BECE question images" on storage.objects;
drop policy if exists "Trusted editors delete BECE question images" on storage.objects;

create policy "Public read BECE question images"
  on storage.objects for select
  using (bucket_id = 'bece-question-images');

create policy "Trusted editors upload BECE question images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bece-question-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

create policy "Trusted editors update BECE question images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'bece-question-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  )
  with check (
    bucket_id = 'bece-question-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );

create policy "Trusted editors delete BECE question images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bece-question-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','teacher','mezzo_staff')
    )
  );
