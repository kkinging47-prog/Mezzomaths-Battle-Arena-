-- Match upload validation: a question's identity includes its choices and diagrams.
-- Same wording alone does not imply the same question. Existing rows are untouched.
create or replace function public.sunday_bece_question_identity(parts text[])
returns text language sql immutable parallel safe security invoker set search_path=pg_catalog as $$
 select md5(jsonb_agg(lower(btrim(regexp_replace(coalesce(value,''),'[[:space:]]+',' ','g'))) order by position)::text)
 from unnest(parts) with ordinality as fields(value,position);
$$;
revoke all on function public.sunday_bece_question_identity(text[]) from public,anon;
grant execute on function public.sunday_bece_question_identity(text[]) to authenticated,service_role;
drop index public.bece_assigned_question_text_unique_idx;
create unique index bece_assigned_question_text_unique_idx on public.bece_question_bank
 (public.sunday_bece_question_identity(array[question_text,option_a,option_b,option_c,option_d,question_image_url,option_a_image_url,option_b_image_url,option_c_image_url,option_d_image_url]))
 where sunday_set_id is not null;
