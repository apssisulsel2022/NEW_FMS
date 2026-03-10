# Data Integrity System (FKs, Cascades, Orphan Prevention)

This document defines how the schema prevents orphan records and enforces parent-child relationships using foreign keys, unique constraints, and explicit cascade rules.

## Relationship Mapping

To generate a complete FK map directly from the live database:

- [relationship_map.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/integrity/relationship_map.sql)

The output includes:

- source table + columns
- referenced table + columns
- ON UPDATE / ON DELETE behaviors

## Parent → Child Hierarchies (High-Level)

Tenant

- `event_organizers`
  - competitions, teams, players, referees, matches, media, jobs, audit logs

Competition lifecycle

- `competition_categories` → `competitions`
- `competitions` → teams, matches, standings, competition_statistics, competition_seasons, competition_stages, sponsors, documents, announcements
- `competition_stages` → groups, rounds
- `competition_groups` → group teams
- `competition_rounds` → round matches

Teams & players

- `teams` → team_players, staff members, standings, match lineups, match stats, match events
- `players` → team_players, match events, player stats, verifications, medical records, contracts, transfers

Matches

- `matches` → match events, lineups, reports, goals/cards/substitutions/shots/fouls, stats, media links

Media

- `media_assets` → variants, tags, links, collections, processing jobs, rights, captions

## Cascade Rules Policy

The schema uses the following decision rules:

- `ON DELETE CASCADE`:
  - dependent rows that have no meaning without the parent and should not exist standalone
  - most junction/join tables and tenant-scoped children
- `ON DELETE SET NULL`:
  - historical rows where the parent can be removed/soft-deleted but the event record must remain
  - example: match events that reference player/team optionally
- `ON DELETE RESTRICT`:
  - relationships that must be preserved for integrity (e.g., prevent deleting a team that is referenced as a match participant)
  - preferred when deletion should be replaced by soft-delete (`status = archived/deleted`)

`ON UPDATE CASCADE` is generally avoided because primary keys are UUIDs and are treated as immutable. If a natural key is referenced (e.g., a `code` column), then `ON UPDATE CASCADE` can be appropriate.

## Junction Tables (Many-to-Many)

Many-to-many relationships are represented with junction tables that enforce a composite uniqueness rule (e.g., `(team_id, player_id)`), preventing duplicate links.

If you require composite primary keys (instead of surrogate UUID primary keys) for junction tables, an optional conversion script is provided:

- [optional_junction_composite_primary_keys.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/zero_downtime/optional_junction_composite_primary_keys.sql)

## Orphan Validation (Pre-Migration)

Run to identify existing orphan records (per FK constraint):

- [find_orphans.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/integrity/find_orphans.sql)

## FK Indexing (Performance + Integrity Operations)

Foreign keys should have supporting indexes on the referencing columns to avoid table scans during:

- deletes/updates on parent tables
- join-heavy reads

Detect missing supporting indexes:

- [find_missing_fk_indexes.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/integrity/find_missing_fk_indexes.sql)

Index strategy rationale:

- [INDEXING_STRATEGY.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/INDEXING_STRATEGY.md)

## Deployment and Maintenance

- Deployment checklist: [INTEGRITY_DEPLOYMENT_CHECKLIST.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/INTEGRITY_DEPLOYMENT_CHECKLIST.md)
- Monitoring alerts: [MONITORING_ALERTS.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/MONITORING_ALERTS.md)
