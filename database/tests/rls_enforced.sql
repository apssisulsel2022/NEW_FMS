do $$
declare
  r record;
  rel_oid oid;
  rel_rls bool;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.column_name = 'event_organizer_id'
  loop
    select cls.oid, cls.relrowsecurity into rel_oid, rel_rls
    from pg_class cls
    join pg_namespace ns on ns.oid = cls.relnamespace
    where ns.nspname = r.table_schema
      and cls.relname = r.table_name;

    if rel_oid is null then
      raise exception 'missing table %.%', r.table_schema, r.table_name;
    end if;

    if rel_rls is distinct from true then
      raise exception 'RLS not enabled on %.%', r.table_schema, r.table_name;
    end if;
  end loop;
end $$;

