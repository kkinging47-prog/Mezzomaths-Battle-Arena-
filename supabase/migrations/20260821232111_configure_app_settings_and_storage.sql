-- Configure production application settings and Supabase Storage.
-- Applied to Mezzo Maths project dnxzjtnrbvrrtfnwwcvp.

insert into public.app_settings (key, value, updated_by, updated_at)
values
  ('platform', jsonb_build_object(
    'app_name','Mezzo Maths Battle Arena',
    'organization','Mezzo House Limited',
    'maintenance_mode',false,
    'signup_enabled',true,
    'default_curriculum','GES',
    'timezone','Africa/Accra'
  ), null, now()),
  ('access', jsonb_build_object(
    'free_access_ends_at','2026-12-31T23:59:59Z',
    'subscription_buttons_visible',true,
    'require_login_to_save',true
  ), null, now()),
  ('features', jsonb_build_object(
    'battle_arena',true,
    'solo_practice',true,
    'smart_board',true,
    'mezzopedia_prep',true,
    'mezzo_junior',true,
    'bece_practice',true,
    'courses',true,
    'career_guidance',true
  ), null, now()),
  ('storage', jsonb_build_object(
    'avatars_bucket','avatars',
    'question_media_bucket','question-media',
    'course_media_bucket','course-media',
    'course_submissions_bucket','course-submissions'
  ), null, now())
on conflict (key) do update
set value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
 ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
 ('question-media','question-media',true,15728640,array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','audio/mpeg','audio/ogg','audio/wav']),
 ('course-media','course-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','audio/mpeg','audio/ogg','audio/wav','video/mp4','video/webm','application/pdf']),
 ('course-submissions','course-submissions',false,20971520,array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
set name=excluded.name, public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars" on storage.objects
for insert to authenticated
with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars" on storage.objects
for update to authenticated
using (bucket_id='avatars' and owner_id=(select auth.uid())::text)
with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars" on storage.objects
for delete to authenticated
using (bucket_id='avatars' and owner_id=(select auth.uid())::text);

drop policy if exists "Staff manage public learning media" on storage.objects;
create policy "Staff manage public learning media" on storage.objects
for all to authenticated
using (
  bucket_id in ('question-media','course-media')
  and (select public.current_profile_role()) in ('admin','teacher','mezzo_staff')
)
with check (
  bucket_id in ('question-media','course-media')
  and (select public.current_profile_role()) in ('admin','teacher','mezzo_staff')
);

drop policy if exists "Students upload own course submissions" on storage.objects;
create policy "Students upload own course submissions" on storage.objects
for insert to authenticated
with check (
  bucket_id='course-submissions'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists "Students read own course submissions" on storage.objects;
create policy "Students read own course submissions" on storage.objects
for select to authenticated
using (
  bucket_id='course-submissions'
  and (
    owner_id=(select auth.uid())::text
    or (select public.current_profile_role()) in ('admin','teacher','mezzo_staff')
  )
);

drop policy if exists "Students update own course submissions" on storage.objects;
create policy "Students update own course submissions" on storage.objects
for update to authenticated
using (bucket_id='course-submissions' and owner_id=(select auth.uid())::text)
with check (
  bucket_id='course-submissions'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists "Students delete own course submissions" on storage.objects;
create policy "Students delete own course submissions" on storage.objects
for delete to authenticated
using (
  bucket_id='course-submissions'
  and (
    owner_id=(select auth.uid())::text
    or (select public.current_profile_role()) in ('admin','teacher','mezzo_staff')
  )
);
