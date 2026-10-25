create table public.question_topic_analysis (
 fingerprint text primary key check (fingerprint ~ '^[a-f0-9]{64}$'),
 version integer not null,
 topic text,
 strand text,
 skill text not null default '',
 confidence text not null check(confidence in ('high','medium','low')),
 model text not null,
 analysed_at timestamptz not null default now()
);
alter table public.question_topic_analysis enable row level security;
revoke all on public.question_topic_analysis from public,anon,authenticated;
grant all on public.question_topic_analysis to service_role;
create table public.question_topic_usage (
 actor text not null,
 usage_day date not null default current_date,
 questions integer not null default 0 check(questions>=0),
 primary key(actor,usage_day)
);
alter table public.question_topic_usage enable row level security;
revoke all on public.question_topic_usage from public,anon,authenticated;
grant all on public.question_topic_usage to service_role;
create or replace function public.consume_question_topic_budget(p_actor text,p_amount integer,p_limit integer) returns boolean
language plpgsql security invoker set search_path=public as $$
declare used integer;
begin
 if p_actor is null or length(p_actor) not between 1 and 120 or p_amount not between 1 and 60 or p_limit not between 1 and 10000 then raise exception 'Invalid topic analysis budget.'; end if;
 insert into public.question_topic_usage(actor,usage_day,questions) values(p_actor,current_date,0) on conflict do nothing;
 select questions into used from public.question_topic_usage where actor=p_actor and usage_day=current_date for update;
 if used+p_amount>p_limit then return false; end if;
 update public.question_topic_usage set questions=questions+p_amount where actor=p_actor and usage_day=current_date;
 return true;
end $$;
revoke all on function public.consume_question_topic_budget(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_question_topic_budget(text,integer,integer) to service_role;
notify pgrst,'reload schema';
create policy "No client access to topic cache" on public.question_topic_analysis for all to anon,authenticated using(false) with check(false);
create policy "No client access to topic usage" on public.question_topic_usage for all to anon,authenticated using(false) with check(false);
