# Indexing Strategy (High-Traffic Tables)

This document describes the indexing strategy for the current schema, aligned to query patterns and the leftmost prefix principle. All online index changes are implemented with `CREATE INDEX CONCURRENTLY` and have rollback scripts using `DROP INDEX CONCURRENTLY`.

## Principles

- Prefer B-tree for equality/range/sort/prefix matching (default choice).
- Use composite indexes that match the most common predicate + ordering:
  - `(tenant_key, created_at desc)` for recent-window lists
  - `(parent_fk, sort_key)` for child lists
  - `(tenant_key, status, run_after)` for queues
- Avoid speculative GIN indexes on JSONB unless:
  - there is a stable containment query (`payload @> ...`)
  - measured benefit outweighs storage overhead
- Keep index overhead bounded:
  - use [08_index_storage_overhead.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/08_index_storage_overhead.sql)
  - target total index size per table <= ~30% of heap size for write-heavy tables

## Hot Query Patterns and Indexes

### Competitions list (tenant)

Pattern:

- `where event_organizer_id = ? order by created_at desc limit N`

Index:

- `competitions_event_organizer_id_created_at_idx` (B-tree)
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)

### Teams list (competition)

Pattern:

- `where competition_id = ? order by created_at desc limit N`

Index:

- `teams_competition_id_created_at_idx` (B-tree)
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)

### Matches list (competition)

Patterns:

- `where competition_id = ? order by scheduled_at asc nulls last limit N`
- `where competition_id = ? and match_status = ? order by scheduled_at asc nulls last limit N`

Indexes:

- `matches_competition_id_scheduled_at_idx` (B-tree)
- `matches_competition_id_match_status_scheduled_at_idx` (B-tree)
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)

### Standings read (competition)

Pattern:

- `where competition_id = ? order by points desc, goal_diff desc, goals_for desc limit N`

Index:

- `standings_competition_rank_idx` (B-tree)
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)

### Match events feed (legacy)

Pattern:

- `where match_id = ? order by created_at asc limit N`

Index:

- `match_events_match_id_created_at_idx` (B-tree)
  - [optimize_indexes_concurrently_v2.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently_v2.sql)

### Job queues (tenant)

Pattern:

- `where event_organizer_id = ? and job_status in (...) order by run_after asc limit N`

Indexes:

- `automation_jobs_tenant_status_run_after_idx` (B-tree)
- `media_processing_jobs_tenant_status_run_after_idx` (B-tree)
- `ai_inference_jobs_tenant_status_run_after_idx` (B-tree)
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)

### Media lists (tenant)

Patterns:

- `where event_organizer_id = ? order by created_at desc limit N`

Indexes:

- `generated_media_event_organizer_created_at_idx`
- `media_assets_event_organizer_created_at_idx`
  - [optimize_indexes_concurrently_v2.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently_v2.sql)

### Player stats and verification history (tenant + player)

Patterns:

- `where event_organizer_id = ? and player_id = ? order by created_at desc limit N`

Indexes:

- `player_statistics_tenant_player_created_at_idx`
- `player_verifications_tenant_player_created_at_idx`
  - [optimize_indexes_concurrently_v2.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently_v2.sql)

## Capturing EXPLAIN ANALYZE (Before/After)

Use:

- [critical_operations_explain.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/critical_operations_explain.sql)
- Runner: [run_explain.ps1](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/run_explain.ps1)

Capture:

- Before applying index migrations
- After applying index migrations

Compare:

- mean execution time
- buffer reads vs hits
- index scan usage vs seq scans

## Storage Impact Analysis (30% Budget)

Measure:

- Per-table index overhead: [08_index_storage_overhead.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/08_index_storage_overhead.sql)
- Unused large indexes: [09_unused_large_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/09_unused_large_indexes.sql)

## Maintenance Schedule and Procedures

Avoid frequent REINDEX by default. Trigger maintenance based on evidence:

- Reindex only when index bloat is confirmed or when a high-value index becomes corrupted.
- Prefer `REINDEX CONCURRENTLY` for online operation.

Script:

- [reindex_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/maintenance/reindex_concurrently.sql)

## Rollback Procedures

Online rollback scripts:

- [rollback_optimize_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/rollback_optimize_indexes.sql)
- [rollback_optimize_indexes_v2.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/rollback_optimize_indexes_v2.sql)

