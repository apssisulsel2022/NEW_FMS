\set ON_ERROR_STOP on

select
  schemaname,
  relname as table_name,
  n_live_tup,
  n_dead_tup,
  round((n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0)) * 100, 2) as dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
from pg_stat_user_tables
order by n_dead_tup desc
limit 200;

