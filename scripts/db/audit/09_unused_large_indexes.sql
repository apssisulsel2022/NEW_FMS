\set ON_ERROR_STOP on

select
  ui.schemaname,
  ui.relname as table_name,
  ui.indexrelname as index_name,
  ui.idx_scan,
  pg_size_pretty(pg_relation_size(ui.indexrelid)) as index_size,
  left(ix.indexdef, 400) as index_def
from pg_stat_user_indexes ui
join pg_indexes ix
  on ix.schemaname = ui.schemaname
 and ix.indexname = ui.indexrelname
where pg_relation_size(ui.indexrelid) > 128 * 1024 * 1024
  and ui.idx_scan = 0
order by pg_relation_size(ui.indexrelid) desc
limit 200;

