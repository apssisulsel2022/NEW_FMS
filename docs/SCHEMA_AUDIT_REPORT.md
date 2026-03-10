# Schema Audit Report (Performance, Scalability, Structure)

This report describes how to audit the current schema, what bottlenecks to look for, and what optimizations are implemented in this repository. It is designed to produce before/after comparisons in a staging or production-like environment.

## Scope

- Table structures (hot columns, TOAST usage, append-heavy patterns)
- Index strategy (missing composite indexes, unused indexes, selectivity)
- Foreign keys (cascade behavior, missing supporting indexes)
- Data types (text vs enum, numeric sizing, JSONB in hot paths)
- Normalization boundaries (where JSONB is acceptable vs where it causes CPU/IO overhead)
- RLS overhead and tenant-key access patterns

## How to Collect Baseline Metrics

1. Enable statement stats (if available):
   - [01_enable_pg_stat_statements.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/01_enable_pg_stat_statements.sql)
2. Collect:
   - Storage: [02_storage_sizes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/02_storage_sizes.sql)
   - Index usage: [03_index_usage.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/03_index_usage.sql)
   - Table IO: [04_table_io.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/04_table_io.sql)
   - Slow queries: [05_slow_queries.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/05_slow_queries.sql)
   - Lock contention: [06_lock_contention.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/06_lock_contention.sql)
   - Autovacuum health: [07_autovacuum_health.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/07_autovacuum_health.sql)

3. Capture query plans for the critical operations set:
   - [BENCHMARKING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/BENCHMARKING.md)

## Key Findings (Static Schema Review)

### 1) Missing Composite Indexes for “filter + order by + limit”

Patterns present in the codebase and ops scripts commonly do:

- Filter by tenant or parent FK
- Order by a timestamp or ranking columns
- Limit to a small window (50–200)

Single-column indexes (e.g., only `competition_id`) often still require sorting or scanning. Composite indexes aligned to the access pattern reduce CPU and latency.

### 2) Job Queue Tables Need Tenant-Scoped Composite Indexes

Queue readers filter by:

- `event_organizer_id`
- `job_status`
- ordered by `run_after`

A non-tenant composite (`job_status, run_after`) causes cross-tenant scans under concurrency.

### 3) RLS Overhead Requires Predictable Tenant Predicates

RLS predicate uses membership checks, but query filters should still include:

- `event_organizer_id = ?` (for tenant-scoped tables)

This improves plan selection and reduces row visibility checks.

## Implemented Optimizations

### Additive Indexes (Zero-Downtime)

The following indexes are implemented as `CREATE INDEX CONCURRENTLY` (safe for online workloads):

- [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)

Rollback:

- [rollback_optimize_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/rollback_optimize_indexes.sql)

## Before/After Performance Comparison

This repo provides the tooling to produce before/after evidence:

- Capture “before” query plans and pg_stat metrics
- Apply online index migration
- Re-run the same workload
- Capture “after” metrics and compare:
  - mean/p95 execution time deltas
  - buffer hit/read deltas
  - index usage deltas (idx_scan)

## Scalability Assessment (10x Volume)

See:

- [PERFORMANCE_TUNING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/PERFORMANCE_TUNING.md)

High-level justification:

- Partitioned append-only tables scale via partition pruning and retention by partition-drop.
- Read paths are optimized for “recent window” access using composite indexes and keyset-friendly ordering.
- Job queues avoid cross-tenant contention via tenant-scoped composite indexes.

