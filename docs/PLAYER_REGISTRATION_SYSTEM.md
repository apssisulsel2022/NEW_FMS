# Player Registration System

This module enables teams (captain/manager roles) to create player profiles and manage competition rosters with eligibility validation, roster status tracking, CSV import/export, audit trails, and real-time roster updates.

## Database

Migration:

- [009_player_registration_system.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/009_player_registration_system.sql)

Schema changes:

- `players` extended with:
  - `player_code` (unique identifier per organizer)
  - contact fields: `email`, `phone`, `address`
  - emergency: `emergency_contact_name`, `emergency_contact_phone`
  - preferences: `primary_position`, `jersey_number_preference`, `jersey_numbers_preference`
- `team_players` extended with:
  - `roster_status` (`active`, `injured`, `suspended`, `inactive`)
  - historical membership support by replacing `unique(team_id, player_id)` with a partial unique index for active rows
  - partial unique jersey-number enforcement per active roster
- Audit triggers:
  - `audit_players`, `audit_team_players`
- RLS policies:
  - team members can read their team roster
  - captains/managers can insert/update/delete roster entries and players scoped to their team’s organizer

## Eligibility rules

Roster operations check `competitions.eligibility_criteria`:

- `minAgeYears`, `maxAgeYears` (age validation via `players.date_of_birth`)
- `maxRosterSize` (limits active roster size)

## API (EO Dashboard, v1)

Roster:

- `GET /api/v1/teams/:id/roster?q=&rosterStatus=`
- `POST /api/v1/teams/:id/roster` (create player + add to roster, or add existing player)
- `PATCH /api/v1/teams/:id/roster/:teamPlayerId`
- `DELETE /api/v1/teams/:id/roster/:teamPlayerId`
- `POST /api/v1/teams/:id/roster/import` (CSV bulk import)
- `GET /api/v1/teams/:id/roster/export` (CSV export)
- `POST /api/v1/teams/:id/roster/transfer` (transfer between rosters)

## UI (EO Dashboard)

- Team roster page: `/teams/:id/roster`
  - search + status filter
  - add player form (required fields enforced)
  - CSV import/export
  - realtime updates via Supabase Postgres Changes on `team_players`

## Notifications and integrations

- Roster changes generate in-app notifications to team members using `public.notifications` (inserted with `event_organizer_id = null` for RLS compatibility).
- Roster changes also emit an `outbox_events` entry with `topic = roster.changed` (inserted with `event_organizer_id = null`) for downstream league integrations.

