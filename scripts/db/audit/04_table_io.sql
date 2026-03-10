\set ON_ERROR_STOP on

select
  schemaname,
  relname as table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_tup_hot_upd,
  n_live_tup,
  n_dead_tup
from pg_stat_user_tables
order by seq_scan desc
limit 200;

select
  schemaname,
  relname as table_name,
  heap_blks_read,
  heap_blks_hit,
  idx_blks_read,
  idx_blks_hit,
  toast_blks_read,
  toast_blks_hit,
  tidx_blks_read,
  tidx_blks_hit
from pg_statio_user_tables
order by heap_blks_read desc
limit 200;

