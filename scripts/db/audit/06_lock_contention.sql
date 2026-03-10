\set ON_ERROR_STOP on

select
  a.pid,
  a.usename,
  a.application_name,
  a.client_addr,
  now() - a.query_start as query_age,
  l.locktype,
  l.mode,
  l.granted,
  left(a.query, 400) as query_sample
from pg_locks l
join pg_stat_activity a on a.pid = l.pid
where a.datname = current_database()
order by l.granted asc, query_age desc
limit 200;

