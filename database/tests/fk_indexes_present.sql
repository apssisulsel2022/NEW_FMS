do $$
declare
  missing_count int;
begin
  with fks as (
    select
      con.oid as constraint_oid,
      con.conname as constraint_name,
      ns_src.nspname as source_schema,
      src.relname as source_table,
      con.conrelid as source_oid,
      con.conkey as fk_cols
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_namespace ns_src on ns_src.oid = src.relnamespace
    where con.contype = 'f'
      and ns_src.nspname = 'public'
  ),
  idx as (
    select
      i.indrelid as table_oid,
      string_to_array(i.indkey::text, ' ')::int[] as index_cols
    from pg_index i
    where i.indisvalid
      and i.indisready
  ),
  missing as (
    select 1
    from fks f
    where not exists (
      select 1
      from idx
      where idx.table_oid = f.source_oid
        and idx.index_cols[1:array_length(f.fk_cols, 1)] = f.fk_cols
    )
  )
  select count(*) into missing_count from missing;

  if missing_count > 0 then
    raise exception 'missing supporting index for % foreign keys; run scripts/db/integrity/find_missing_fk_indexes.sql', missing_count;
  end if;
end $$;

