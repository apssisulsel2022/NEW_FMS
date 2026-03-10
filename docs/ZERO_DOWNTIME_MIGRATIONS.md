# Zero-Downtime Migrations

PostgreSQL is ACID by default, but schema changes can still cause downtime if they block high-concurrency workloads. This guide defines a safe expand/contract approach compatible with >10k TPS workloads.

## Rules

- Prefer additive schema changes:
  - Add nullable columns first
  - Backfill in batches
  - Add constraints as NOT VALID, validate later
- Create indexes concurrently
- Avoid long-running transactions
- Keep application changes backward compatible during rollout

## Expand / Contract Pattern

### 1) Expand (Add Column)

1. Add column as nullable without default.
2. Deploy application writing both old and new (dual write).
3. Backfill existing rows in batches.
4. Add default for new rows (optional).
5. Add NOT NULL as final step when safe.

Example scripts:

- [add_column_expand.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/add_column_expand.sql)
- [backfill_batches.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/backfill_batches.sql)
- [contract_drop_old.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/contract_drop_old.sql)

### 2) Indexing

Use:

- `CREATE INDEX CONCURRENTLY`
- `DROP INDEX CONCURRENTLY`

Never run these inside a transaction block.

Example:

- [create_index_concurrently.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/create_index_concurrently.sql)

### 3) Constraints

For large tables:

- Add constraints as `NOT VALID`
- Validate asynchronously

Example:

```sql
alter table public.match_event_stream
  add constraint match_event_stream_minute_ck check (minute is null or minute >= 0) not valid;

alter table public.match_event_stream validate constraint match_event_stream_minute_ck;
```

### 4) Table Rewrites (Avoid)

Avoid operations that rewrite whole tables in-place on large relations:

- Adding a column with a volatile default
- Changing column types without a cast plan

If unavoidable, use shadow tables + triggers + swap.

