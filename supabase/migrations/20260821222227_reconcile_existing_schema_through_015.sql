-- Reconciliation checkpoint for the existing Mezzo Maths production schema.
--
-- The database was originally built through SQL execution without entries in
-- supabase_migrations.schema_migrations. Migrations 002-015 are already
-- represented by the live objects. This assertion-only migration establishes
-- a safe tracked checkpoint without recreating or altering those objects.

do $$
declare
  required_table text;
  required_tables text[] := array[
    'profiles',
    'question_bank',
    'ai_question_generations',
    'smart_board_contests',
    'smart_board_leaderboards',
    'battle_match_queue',
    'course_sessions',
    'course_lessons',
    'course_enrollments',
    'course_lesson_progress',
    'course_chapters',
    'course_chapter_quizzes',
    'course_trials',
    'course_trial_submissions',
    'course_purchases',
    'course_coupons',
    'course_access_grants',
    'course_certificates',
    'course_reviews',
    'course_discussions',
    'course_notifications',
    'course_submission_files',
    'brain_test_results',
    'brain_test_samples',
    'teacher_classroom_resources',
    'teacher_exam_sets',
    'bece_question_bank',
    'course_media_assets',
    'course_interactive_tasks',
    'game_score_records',
    'user_progress_snapshots',
    'app_settings',
    'teacher_assignments',
    'teacher_assignment_questions',
    'teacher_assignment_attempts',
    'teacher_assignment_responses'
  ];
begin
  foreach required_table in array required_tables loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'Migration reconciliation failed: missing table public.%', required_table;
    end if;
  end loop;

  if to_regprocedure('public.current_profile_role()') is null then
    raise exception 'Migration reconciliation failed: missing public.current_profile_role()';
  end if;

  if to_regprocedure('public.protect_profile_role_and_approval()') is null then
    raise exception 'Migration reconciliation failed: missing public.protect_profile_role_and_approval()';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'protect_profile_role_and_approval_trigger'
      and not t.tgisinternal
  ) then
    raise exception 'Migration reconciliation failed: missing profile role-protection trigger';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approval_status'
  ) then
    raise exception 'Migration reconciliation failed: missing profiles.approval_status';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles update own or admin via helper'
  ) then
    raise exception 'Migration reconciliation failed: missing migration 014 profile policy';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_assignments'
      and policyname = 'Teachers manage own assignments'
  ) then
    raise exception 'Migration reconciliation failed: missing migration 015 assignment policy';
  end if;
end
$$;
