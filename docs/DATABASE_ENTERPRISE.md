# Enterprise Database Architecture (PostgreSQL)

This repository uses PostgreSQL (Supabase) with multi-tenant isolation enforced by Row Level Security (RLS). Tenancy is modeled by `public.event_organizers` and referenced by `event_organizer_id` across tenant-scoped tables.

## DDL (Schema)

Full schema is defined by executing migrations in order:

- [001_init.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/001_init.sql)
- [002_enterprise.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/002_enterprise.sql)
- [003_enterprise_ext.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/003_enterprise_ext.sql)

The combined schema contains 120–150 normalized tables (including partitioned tables and default partitions) covering:

- Users & RBAC: roles, permissions, tenant roles, API keys, idempotency keys
- Competition lifecycle: seasons, stages, groups, rounds, sponsors, documents, announcements, awards, disciplinary
- Teams & players: staff, rosters, positions, contracts, transfers, medical and safety records
- Matches: officials, lineups, substitutions, events (stream), goals, cards, shots, fouls, penalties, clock/snapshots
- Statistics: definitions, units/categories, ingestions, leaderboards, team/player match stats
- Media: assets, variants, links, tags/collections, processing jobs, captions, rights, access logs
- AI/Automation: models, inference jobs/results, outbox/inbox for event-driven processing

## Partitioning Strategy

High-volume tables are created as range-partitioned on `created_at`:

- `public.audit_log`
- `public.match_event_stream`
- `public.tracking_frames`
- `public.media_access_log`
- `public.outbox_events`

Each has a default partition (`*_default`). For production scale, create time-based partitions (weekly/monthly) ahead of time and drop old partitions based on retention requirements.

## RLS (Multi-Tenant)

Tenant-scoped tables generally use:

- `public.is_event_organizer_member(event_organizer_id)` for authenticated CRUD
- Public read policies for published competitions remain in core tables (e.g., `competitions`, `teams`, `matches`, `match_events`, `standings`)

Global reference tables (e.g., stat definitions) are readable by authenticated users and writable by `super_admin` only via `public.is_super_admin()`.

## Documentation & Operations

- Data dictionary: [DATA_DICTIONARY.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/DATA_DICTIONARY.md)
- ERD generation: [ERD.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/ERD.md)
- Zero-downtime migrations: [ZERO_DOWNTIME_MIGRATIONS.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/ZERO_DOWNTIME_MIGRATIONS.md)
- Benchmarking & query plans: [BENCHMARKING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/BENCHMARKING.md)
- Security hardening: [SECURITY_HARDENING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/SECURITY_HARDENING.md)
- Backup & recovery: [BACKUP_RECOVERY.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/BACKUP_RECOVERY.md)
- Performance tuning at 100M-row scale: [PERFORMANCE_TUNING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/PERFORMANCE_TUNING.md)

