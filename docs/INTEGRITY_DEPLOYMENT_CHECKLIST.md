# Data Integrity Deployment Checklist

This checklist is designed for applying new integrity constraints and supporting indexes to an existing production database with minimal disruption.

## Pre-Checks

- Confirm schema version (migrations applied).
- Confirm application uses soft-delete where required (`status`), not hard deletes on historical entities.
- Capture baseline metrics and plans:
  - [BENCHMARKING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/BENCHMARKING.md)
  - [SCHEMA_AUDIT_REPORT.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/SCHEMA_AUDIT_REPORT.md)

## Orphan Validation (Before Constraints)

- Run orphan scan:
  - [find_orphans.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/integrity/find_orphans.sql)
- If orphans exist:
  - fix data (insert missing parents, delete/soft-delete broken children, or set FK columns to null if business rules allow)

## Index Readiness

- Check missing FK supporting indexes:
  - [find_missing_fk_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/integrity/find_missing_fk_indexes.sql)
- Apply missing indexes using `CREATE INDEX CONCURRENTLY` (online):
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)
  - [optimize_indexes_concurrently_v2.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently_v2.sql)

## Constraint Application Strategy

For new FK constraints on large tables:

1. Add FK as `NOT VALID`
2. Validate later during low-traffic window:
   - `alter table ... validate constraint ...`

Validation script:

- [validate_integrity_constraints.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/validate_integrity_constraints.sql)

## Verification

- Re-run orphan scan (should report none).
- Re-run `EXPLAIN (ANALYZE, BUFFERS)` critical operations:
  - [run_explain.ps1](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/run_explain.ps1)
- Validate storage overhead:
  - [08_index_storage_overhead.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit/08_index_storage_overhead.sql)

## Rollback

- If an index causes regressions:
  - drop online:
    - [rollback_optimize_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/rollback_optimize_indexes.sql)
    - [rollback_optimize_indexes_v2.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/rollback_optimize_indexes_v2.sql)
  - drop integrity constraints:
    - [rollback_integrity_constraints.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/rollback_integrity_constraints.sql)

## Ongoing Maintenance

- Monitor index usage and scan patterns:
  - [MONITORING_ALERTS.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/MONITORING_ALERTS.md)
- Only `REINDEX CONCURRENTLY` on evidence:
  - [reindex_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/maintenance/reindex_concurrently.sql)
