\set ON_ERROR_STOP on

do $$
declare
  r record;
  sql text;
  orphan_count bigint;
begin
  for r in
    select
      con.oid as constraint_oid,
      con.conname as constraint_name,
      ns_src.nspname as source_schema,
      src.relname as source_table,
      ns_ref.nspname as referenced_schema,
      ref.relname as referenced_table,
      con.conkey as source_attnums,
      con.confkey as ref_attnums
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_namespace ns_src on ns_src.oid = src.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join pg_namespace ns_ref on ns_ref.oid = ref.relnamespace
    where con.contype = 'f'
      and ns_src.nspname = 'public'
  loop
    sql := format(
      'select count(*) from %I.%I s where %s and not exists (select 1 from %I.%I p where %s)',
      r.source_schema,
      r.source_table,
      (
        select string_agg(format('s.%I is not null', att.attname), ' and ' order by k.n)
        from unnest(r.source_attnums) with ordinality as k(attnum, n)
        join pg_attribute att on att.attrelid = (select oid from pg_class where relname = r.source_table and relnamespace = (select oid from pg_namespace where nspname = r.source_schema)) and att.attnum = k.attnum
      ),
      r.referenced_schema,
      r.referenced_table,
      (
        select string_agg(format('p.%I = s.%I', att_ref.attname, att_src.attname), ' and ' order by k.n)
        from unnest(r.source_attnums) with ordinality as k(attnum, n)
        join unnest(r.ref_attnums) with ordinality as rk(attnum, n) on rk.n = k.n
        join pg_attribute att_src on att_src.attrelid = (select oid from pg_class where relname = r.source_table and relnamespace = (select oid from pg_namespace where nspname = r.source_schema)) and att_src.attnum = k.attnum
        join pg_attribute att_ref on att_ref.attrelid = (select oid from pg_class where relname = r.referenced_table and relnamespace = (select oid from pg_namespace where nspname = r.referenced_schema)) and att_ref.attnum = rk.attnum
      )
    );

    execute sql into orphan_count;

    if orphan_count > 0 then
      raise notice 'FK % on %.% -> %.% has % orphan rows', r.constraint_name, r.source_schema, r.source_table, r.referenced_schema, r.referenced_table, orphan_count;
    end if;
  end loop;
end $$;

