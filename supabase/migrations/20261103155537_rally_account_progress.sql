create table public.rally_player_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{"cup":{},"progress":{},"garage":{},"history":[]}',
 updated_at timestamptz not null default now(),
 constraint rally_progress_object check(jsonb_typeof(state)='object' and octet_length(state::text)<=524288)
);
alter table public.rally_player_progress enable row level security;
revoke all on public.rally_player_progress from public,anon;
grant select,insert,update on public.rally_player_progress to authenticated;
create policy "Players read own Rally progress" on public.rally_player_progress for select to authenticated using ((select auth.uid())=user_id);
create policy "Players insert own Rally progress" on public.rally_player_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Players update own Rally progress" on public.rally_player_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- Row locking merges independent devices' achievements instead of replacing them.
create or replace function public.sync_rally_progress(p_patch jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare uid uuid:=auth.uid(); old jsonb; merged jsonb; cups jsonb; stages jsonb; recent jsonb;
begin
 if uid is null then raise exception 'Sign in to save Rally progress.'; end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or octet_length(p_patch::text)>262144 then raise exception 'Invalid Rally progress.'; end if;
 if (p_patch?'cup' and jsonb_typeof(p_patch->'cup')<>'object') or (p_patch?'progress' and jsonb_typeof(p_patch->'progress')<>'object') or (p_patch?'garage' and jsonb_typeof(p_patch->'garage')<>'object') or (p_patch?'history' and jsonb_typeof(p_patch->'history')<>'array') then raise exception 'Invalid Rally progress fields.'; end if;
 insert into public.rally_player_progress(user_id) values(uid) on conflict do nothing;
 select state into old from public.rally_player_progress where user_id=uid for update;
 select coalesce(jsonb_object_agg(key,value),'{}') into cups from (
  select key,to_jsonb(greatest(0,least(3,max(case when jsonb_typeof(value)='number' then (value::text)::numeric else 0 end)))::int) value
  from (select * from jsonb_each(coalesce(old->'cup','{}')) union all select * from jsonb_each(coalesce(p_patch->'cup','{}'))) x
  where key in ('sprint','oval','circle','triangle','zigzag','spiral','eight','snake','diamond','star','monster') group by key
 ) c;
 if exists(select 1 from jsonb_each(coalesce(p_patch->'progress','{}')) where jsonb_typeof(value)<>'array' or length(key)>700) then raise exception 'Invalid stage progress.'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into stages from (
  select key,jsonb_agg(distinct id) value from (
   select key,id from (select * from jsonb_each(coalesce(old->'progress','{}')) union all select * from jsonb_each(coalesce(p_patch->'progress','{}'))) x
   cross join lateral jsonb_array_elements_text(x.value) f(id)
   where id in ('sprint','oval','circle','triangle','zigzag','spiral','eight','snake','diamond','star','monster')
  ) p group by key
 ) c;
 select coalesce(jsonb_agg(value order by value->>'completedAt' desc,value->>'id' desc),'[]') into recent from (
  select distinct on (value->>'id') value from jsonb_array_elements(coalesce(p_patch->'history','[]')||coalesce(old->'history','[]')) x(value)
  where jsonb_typeof(value)='object' and length(value->>'id') between 1 and 100 and length(value->>'completedAt') between 1 and 40
  order by value->>'id',value->>'completedAt' desc
 ) h;
 select coalesce(jsonb_agg(value),'[]') into recent from (select value from jsonb_array_elements(recent) x(value) limit 10) r;
 merged:=jsonb_build_object('cup',cups,'progress',stages,'garage',coalesce(p_patch->'garage',old->'garage','{}'),'history',recent);
 update public.rally_player_progress set state=merged,updated_at=clock_timestamp() where user_id=uid;
 return merged;
end $$;
revoke all on function public.sync_rally_progress(jsonb) from public,anon;
grant execute on function public.sync_rally_progress(jsonb) to authenticated;
