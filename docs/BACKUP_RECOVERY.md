# Backup & Recovery Playbook (RPO ≤ 15 min, RTO ≤ 1 h)

This playbook assumes a managed PostgreSQL provider (e.g., Supabase) or a self-managed Postgres cluster with WAL archiving enabled.

## Targets

- RPO ≤ 15 minutes: use continuous WAL archiving + frequent base backups
- RTO ≤ 1 hour: automate restore and rehearse recovery regularly

## Backup Strategy

### Continuous WAL Archiving

- Enable WAL archiving to durable object storage
- Ensure retention >= the maximum expected recovery window (commonly 7–30 days)

### Base Backups

- Nightly base backups
- Optional: additional base backups every 6–12 hours for faster restore

### Logical Backups (Optional)

- Periodic `pg_dump` for:
  - schema-only snapshots
  - reference/config tables
  - portability across environments

## Restore Strategy

### Point-in-Time Recovery (PITR)

Use PITR for most incidents:

- Restore last base backup
- Replay WAL up to a timestamp (or LSN) before incident

### Verification

After restore:

- Validate schema version (migrations applied)
- Validate RLS is enabled on tenant-scoped tables
- Run smoke queries:
  - list competitions by tenant
  - list matches by competition
  - list standings
  - ingest a match_event_stream row

## Incident Runbooks

### Accidental Delete / Bad Migration

- Determine incident time
- PITR to T-1 minute into a new restore environment
- Compare critical tables and selectively rehydrate data if partial recovery is needed

### Corruption / Storage Failure

- Failover to replica (if available)
- If failover is not possible, execute PITR

## Recovery Drills

Minimum cadence:

- Monthly PITR drill into staging
- Quarterly full restore drill with application smoke test

Track:

- Actual RPO achieved (WAL lag at drill start)
- Actual RTO achieved (time to service readiness)

