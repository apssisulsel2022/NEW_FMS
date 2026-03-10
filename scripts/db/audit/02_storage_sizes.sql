\set ON_ERROR_STOP on

select
  n.nspname as schema_name,
  c.relname as table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  pg_size_pretty(pg_relation_size(c.oid)) as heap_size,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_toast_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by pg_total_relation_size(c.oid) desc
limit 200;

