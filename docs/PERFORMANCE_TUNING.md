# Performance Tuning Guide (100M+ Rows Scale)

This guide focuses on high-concurrency read/write workloads and large relations (100M+ rows) in event/log style tables such as `match_event_stream`, `tracking_frames`, `media_access_log`, and `audit_log`.

## Data Modeling Patterns

- Use append-only for high-volume tables.
- Partition high-volume tables by time (`created_at`) and manage partitions with retention policies.
- Keep hot-path queries covered by composite indexes that match filter + order.

## Partitioning

Partitioned tables in this schema:

- `audit_log` partition by `created_at`
- `match_event_stream` partition by `created_at`
- `tracking_frames` partition by `created_at`
- `media_access_log` partition by `created_at`
- `outbox_events` partition by `created_at`

Operational guidance:

- Create partitions ahead of time (e.g., monthly).
- Keep a default partition for safety.
- Drop whole partitions for retention instead of deleting rows.

## Indexing Guidelines

General:

- Prefer fewer, highly selective indexes on write-heavy tables.
- Use composite indexes aligned with read patterns:
  - `(...tenant..., created_at desc)`
  - `(...match_id..., created_at desc)`

Examples already present in migrations:

- `match_event_stream(match_id, created_at desc)`
- `audit_log(event_organizer_id, created_at desc)`

## Autovacuum & Bloat

For append-heavy partitions:

- Keep partitions small enough so vacuum cycles complete.
- Tune autovacuum per table/partition when needed.

For update-heavy tables (e.g., jobs):

- Ensure suitable `fillfactor` and vacuum settings.

## Connection Pooling

For >10k TPS, use a pooler:

- PgBouncer in transaction mode for HTTP APIs
- Ensure RLS and auth context are applied per transaction/session correctly

## Query Patterns

Hot paths:

- Standings reads: ensure `standings(competition_id)` and sort columns are indexed if necessary.
- Match event feeds: use `match_event_stream` with `(match_id, created_at desc)` and pagination by `(created_at, id)` for stable keyset pagination.

Avoid:

- Offset pagination on very large partitions for deep pages.
- `SELECT *` in tight loops for large payload columns.

## Load Testing (Methodology)

Recommended approach:

1. Generate realistic data at scale:
   - competitions: 10k–100k
   - matches: 1M–10M
   - match_event_stream: 100M+
2. Run mixed workload with read/write ratios matching production.
3. Capture:
   - P95/P99 latency
   - lock waits
   - WAL volume
   - cache hit ratios
4. Iterate indexes and partitions.

## Plan Stability

Always capture:

- `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)`

Use: [BENCHMARKING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/BENCHMARKING.md)

