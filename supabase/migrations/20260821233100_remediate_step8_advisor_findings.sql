-- Remediate actionable Supabase performance-advisor findings without changing access semantics.

do $$
declare r record;
begin
  for r in
    select n.nspname, t.relname, c.conname,
           string_agg(format('%I', a.attname), ', ' order by k.ord) as cols
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    cross join lateral unnest(c.conkey) with ordinality as k(attnum,ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
    where c.contype='f' and n.nspname='public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=c.conrelid and i.indisvalid
          and (
            select array_agg(v.attnum order by v.ord)
            from unnest(i.indkey::smallint[]) with ordinality as v(attnum,ord)
            where v.ord <= cardinality(c.conkey)
          ) = c.conkey
      )
    group by n.nspname,t.relname,c.conname
  loop
    execute format('create index if not exists %I on %I.%I (%s)',
      left(r.conname,54)||'_idx',r.nspname,r.relname,r.cols);
  end loop;
end $$;

create temporary table step8_policy_snapshot on commit drop as
select * from pg_policies
where schemaname='public' and tablename = any(array[
'academic_progress_records','app_settings','bece_question_bank','brain_test_samples',
'course_access_grants','course_certificates','course_chapter_quizzes','course_chapters',
'course_coupons','course_interactive_tasks','course_lessons','course_media_assets',
'course_notifications','course_purchases','course_sessions','course_trials',
'game_score_records','junior_media_assets','junior_questions','learner_monitoring_profiles',
'question_bank','student_progress','teacher_assignments','user_progress_snapshots'
]);

do $$
declare
  t record; p record; anon_qual text; auth_qual text; role_list text; check_expr text;
begin
  for t in select distinct tablename from step8_policy_snapshot order by tablename loop
    select string_agg('('||qual||')',' OR ' order by policyname)
      filter (where cmd in ('SELECT','ALL') and ('public'::name=any(roles) or 'anon'::name=any(roles))),
      string_agg('('||qual||')',' OR ' order by policyname)
      filter (where cmd in ('SELECT','ALL') and ('public'::name=any(roles) or 'authenticated'::name=any(roles)))
    into anon_qual,auth_qual
    from step8_policy_snapshot where tablename=t.tablename;

    for p in select * from step8_policy_snapshot where tablename=t.tablename and cmd='ALL' loop
      select string_agg(quote_ident(x),',') into role_list
      from (
        select distinct case when u::text='public' then 'authenticated' else u::text end x
        from unnest(p.roles) u
      ) s;
      check_expr:=coalesce(p.with_check,p.qual,'true');
      execute format('drop policy %I on public.%I',p.policyname,t.tablename);
      execute format('create policy %I on public.%I for insert to %s with check (%s)',
        left(p.policyname,51)||' insert',t.tablename,role_list,check_expr);
      execute format('create policy %I on public.%I for update to %s using (%s) with check (%s)',
        left(p.policyname,51)||' update',t.tablename,role_list,coalesce(p.qual,'true'),check_expr);
      execute format('create policy %I on public.%I for delete to %s using (%s)',
        left(p.policyname,51)||' delete',t.tablename,role_list,coalesce(p.qual,'true'));
    end loop;

    for p in select * from step8_policy_snapshot where tablename=t.tablename and cmd='SELECT' loop
      execute format('drop policy %I on public.%I',p.policyname,t.tablename);
    end loop;

    if anon_qual is not null then
      execute format('create policy %I on public.%I for select to anon using (%s)',
        'Consolidated anonymous read',t.tablename,anon_qual);
    end if;
    if auth_qual is not null then
      execute format('create policy %I on public.%I for select to authenticated using (%s)',
        'Consolidated authenticated read',t.tablename,auth_qual);
    end if;
  end loop;
end $$;

do $$
declare p record; q text; w text; stmt text;
begin
  for p in
    select * from pg_policies
    where schemaname='public'
      and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
  loop
    q:=coalesce(replace(p.qual,'auth.uid()','(select auth.uid())'),'true');
    w:=coalesce(replace(p.with_check,'auth.uid()','(select auth.uid())'),q,'true');
    stmt:=format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
    if p.cmd in ('SELECT','DELETE') then
      stmt:=stmt||format(' using (%s)',q);
    elsif p.cmd='INSERT' then
      stmt:=stmt||format(' with check (%s)',w);
    else
      stmt:=stmt||format(' using (%s) with check (%s)',q,w);
    end if;
    execute stmt;
  end loop;
end $$;

revoke all privileges on all tables in schema public from anon, authenticated;

do $$
declare t record; role_name text; op text; permitted boolean;
begin
  for t in select c.relname
           from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relkind in ('r','p') loop
    foreach role_name in array array['anon','authenticated'] loop
      foreach op in array array['select','insert','update','delete'] loop
        select exists(
          select 1 from pg_policies p
          where p.schemaname='public' and p.tablename=t.relname
            and (lower(p.cmd)=op or p.cmd='ALL')
            and (
              'public'::name=any(p.roles)
              or (role_name='anon' and 'anon'::name=any(p.roles))
              or (role_name='authenticated' and 'authenticated'::name=any(p.roles))
            )
        ) into permitted;
        if permitted then
          execute format('grant %s on table public.%I to %I',op,t.relname,role_name);
        end if;
      end loop;
    end loop;
  end loop;
end $$;
