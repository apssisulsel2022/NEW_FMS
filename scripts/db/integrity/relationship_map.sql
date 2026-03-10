\set ON_ERROR_STOP on

select
  con.conname as constraint_name,
  ns_src.nspname as source_schema,
  src.relname as source_table,
  string_agg(att_src.attname, ', ' order by k.n) as source_columns,
  ns_ref.nspname as referenced_schema,
  ref.relname as referenced_table,
  string_agg(att_ref.attname, ', ' order by k.n) as referenced_columns,
  con.confupdtype as on_update,
  con.confdeltype as on_delete
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_namespace ns_src on ns_src.oid = src.relnamespace
join pg_class ref on ref.oid = con.confrelid
join pg_namespace ns_ref on ns_ref.oid = ref.relnamespace
join lateral unnest(con.conkey) with ordinality as k(attnum, n) on true
join lateral unnest(con.confkey) with ordinality as r(attnum, n) on r.n = k.n
join pg_attribute att_src on att_src.attrelid = src.oid and att_src.attnum = k.attnum
join pg_attribute att_ref on att_ref.attrelid = ref.oid and att_ref.attnum = r.attnum
where con.contype = 'f'
  and ns_src.nspname = 'public'
order by source_table, constraint_name;

