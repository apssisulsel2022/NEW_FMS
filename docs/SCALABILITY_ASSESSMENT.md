# Scalability Assessment (10× Data Volume, Sub-Second Targets)

This document explains how to validate that the schema and access patterns remain performant at ~10× current volume, targeting sub-second response times for interactive read paths.

## Assumptions

- Workload is mixed read/write with append-heavy event tables.
- Tenancy is enforced by RLS; most queries include tenant predicates.
- Connection pooling is used (PgBouncer recommended for HTTP APIs).

## Primary Risks

- Cross-tenant scans in queue tables (`job_status, run_after` without tenant prefix)
- Large ORDER BY sorts without composite indexes (filter + order + limit)
- Offset pagination on large tables
- JSONB-heavy columns selected in hot paths (`select *`) causing TOAST reads
- Autovacuum lag on update-heavy tables (jobs, notifications)

## Mitigations Implemented

- Tenant-scoped composite indexes for queues and sorted lists:
  - [optimize_indexes_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optimize_indexes_concurrently.sql)
- Partitioning for 100M+ row tables:
  - `audit_log`, `match_event_stream`, `tracking_frames`, `media_access_log`, `outbox_events`

## Validation Method (Recommended)

1. Generate/clone a dataset at ~10× volume (staging).
2. Apply the same Postgres parameters and pooling strategy as production.
3. Run the critical operations workload:
   - [critical_operations.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/critical_operations.sql)
4. Capture:
   - query plans: [run_explain.ps1](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/run_explain.ps1)
   - index usage + IO: [scripts/db/audit](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/audit)
5. Confirm:
   - interactive reads (lists, standings, match feeds) remain < 1s at P95
   - inserts for event streams remain stable with partition pruning and correct indexes

## Ongoing Monitoring

Use:

- [MONITORING_ALERTS.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/MONITORING_ALERTS.md)

