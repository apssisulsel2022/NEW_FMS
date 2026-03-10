\set ON_ERROR_STOP on

with rel as (
  select
    c.oid,
    n.nspname as schema_name,
    c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
),
sizes as (
  select
    r.schema_name,
    r.table_name,
    pg_relation_size(r.oid) as heap_bytes,
    pg_indexes_size(r.oid) as index_bytes,
    pg_total_relation_size(r.oid) as total_bytes
  from rel r
)
select
  schema_name,
  table_name,
  pg_size_pretty(heap_bytes) as heap_size,
  pg_size_pretty(index_bytes) as index_size,
  pg_size_pretty(total_bytes) as total_size,
  round((index_bytes::numeric / nullif(heap_bytes, 0)) * 100, 2) as index_overhead_pct
from sizes
order by index_overhead_pct desc nulls last, total_bytes desc
limit 200;

