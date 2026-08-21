-- Legacy write policies declared TO public even though they require an authenticated UID.
-- Restrict writes to authenticated and rebuild API table grants from RLS policy commands.

do $$
declare p record; role_list text;
begin
  for p in
    select * from pg_policies
    where schemaname='public' and cmd in ('ALL','INSERT','UPDATE','DELETE')
      and 'public'::name=any(roles)
  loop
    select string_agg(quote_ident(x),',') into role_list
    from (
      select distinct case when u::text='public' then 'authenticated' else u::text end x
      from unnest(p.roles) u
    ) s;
    execute format('alter policy %I on %I.%I to %s',
      p.policyname,p.schemaname,p.tablename,role_list);
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
