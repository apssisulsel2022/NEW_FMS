# Monitoring & Alerts (Schema Health)

This document provides alert queries and recommended thresholds for keeping PostgreSQL schema performance healthy under high concurrency.

## Slow Queries

Prerequisite: `pg_stat_statements`.

Alert when:

- Top queries have mean > 200ms, or total_exec_time spikes abnormally.

Use:

- [05_slow_queries.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/05_slow_queries.sql)

## Index Usage Regression

Alert when:

- Large indexes have `idx_scan = 0` over a full business cycle (candidate for removal)
- High `seq_scan` on large tables with obvious predicates (missing index)

Use:

- [03_index_usage.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/03_index_usage.sql)
- [04_table_io.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/04_table_io.sql)
- [09_unused_large_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/09_unused_large_indexes.sql)

## Storage Growth

Alert when:

- Table/index size growth exceeds expected daily baselines
- TOAST growth spikes on JSONB-heavy tables

Use:

- [02_storage_sizes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/02_storage_sizes.sql)
- [08_index_storage_overhead.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/08_index_storage_overhead.sql)

## Autovacuum Lag / Bloat Risk

Alert when:

- dead_pct > 20% on update-heavy tables
- `last_autovacuum` is older than expected for hot tables

Use:

- [07_autovacuum_health.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/07_autovacuum_health.sql)

## Lock Contention

Alert when:

- ungranted locks exist for sustained periods
- long-running queries block DDL or hot writes

Use:

- [06_lock_contention.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/06_lock_contention.sql)

## Partition Health

Alert when:

- partitioned tables have only default partitions (indicates missing partition maintenance)
- partitions exceed intended retention window

Recommended operational automation:

- create partitions ahead of time (weekly/monthly)
- drop old partitions rather than deleting rows
