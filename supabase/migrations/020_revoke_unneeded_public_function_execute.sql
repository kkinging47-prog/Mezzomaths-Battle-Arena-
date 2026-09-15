-- Revoke unneeded public execution on internal security-definer functions.
-- Run after migration 019.

revoke execute on function public.sync_bece_sunday_public_leaderboard() from public, anon, authenticated;
revoke execute on function public.touch_current_user_login() from public, anon;
grant execute on function public.touch_current_user_login() to authenticated;

-- These two are intentionally callable from the public app:
-- public.has_bece_sunday_attempt(text, date): returns only true/false for duplicate Sunday attempt protection.
-- public.consume_public_rate_limit(text, text, integer, integer): stores only hashed rate-limit keys.
