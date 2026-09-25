-- Restrict BECE management RPCs to signed-in users. Each management function
-- verifies the caller's admin/editor entitlement before returning or writing.
-- The public trial's boolean duplicate-attempt check remains public so guests
-- receive the one-attempt warning before starting; the unique index enforces it.
-- The unused rate-limit RPC is reserved for server-side use.
revoke execute on function public.assign_sunday_bece_question_editor(text,text) from public, anon;
revoke execute on function public.revoke_sunday_bece_question_editor(text) from public, anon;
revoke execute on function public.is_sunday_bece_admin() from public, anon;
revoke execute on function public.can_manage_sunday_bece_questions() from public, anon;
revoke execute on function public.consume_public_rate_limit(text,text,integer,integer) from public, anon, authenticated;

grant execute on function public.assign_sunday_bece_question_editor(text,text) to authenticated;
grant execute on function public.revoke_sunday_bece_question_editor(text) to authenticated;
grant execute on function public.is_sunday_bece_admin() to authenticated;
grant execute on function public.can_manage_sunday_bece_questions() to authenticated;
