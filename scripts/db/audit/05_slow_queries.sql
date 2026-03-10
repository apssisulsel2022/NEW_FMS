\set ON_ERROR_STOP on

select
  queryid,
  calls,
  round(total_exec_time::numeric, 2) as total_ms,
  round(mean_exec_time::numeric, 3) as mean_ms,
  round(stddev_exec_time::numeric, 3) as stddev_ms,
  rows,
  shared_blks_hit,
  shared_blks_read,
  temp_blks_read,
  temp_blks_written,
  left(query, 500) as query_sample
from pg_stat_statements
where dbid = (select oid from pg_database where datname = current_database())
order by total_exec_time desc
limit 50;

