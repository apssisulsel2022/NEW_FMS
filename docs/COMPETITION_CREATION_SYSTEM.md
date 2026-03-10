# Competition Creation System (EO Module)

This module enables Event Organizers to create, configure, and manage competitions using a multi-step workflow with draft saving, preview, templates, participant import, automated scheduling, notifications, status tracking, and analytics.

## Key Capabilities

- Multi-step competition setup with drafts (save/resume)
- Template management (tenant + global templates)
- Competition format selection (tenant + global formats)
- Bulk participant import (CSV → teams + participants)
- Automated scheduling (round-robin fixture generation → matches)
- Notifications on publish
- Status tracking + history
- Analytics summary view

## Database Schema

Migration:

- [007_competition_creation_system.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/007_competition_creation_system.sql)

Core additions:

- `competitions` extended with:
  - `description`, registration window, participant limits, prize/eligibility/judging JSONB
  - `entry_fee_cents`, `currency`, `allow_public_registration`
  - `competition_state` and `state`
- `competition_templates` for reusable configs
- `competition_drafts` for multi-step creation flows
- `competition_participants` for registrations (team/player/user)
- `competition_participant_import_jobs` for bulk import tracking
- `competition_status_history` for state transitions
- `competition_analytics_summary` view for dashboard metrics

## Security and RBAC

Database:

- RLS enabled for competition-related tables and core tenant tables (`competitions`, `teams`, `matches`, `players`, `team_players`).
- Policies:
  - anonymous read is permitted only for published competitions (and their teams/matches)
  - authenticated access is tenant-scoped via `public.is_event_organizer_member(event_organizer_id)`

API:

- EO API v1 enforces role-based access using `event_organizer_members.member_role`:
  - create/publish/scheduling/import requires `owner` or `admin`
  - read/list and draft editing allows `staff` members

## API Endpoints (EO Dashboard)

Templates:

- `GET /api/v1/competition-templates?eventOrganizerId=...`
- `POST /api/v1/competition-templates`
- `GET /api/v1/competition-templates/:id`
- `PATCH /api/v1/competition-templates/:id`
- `DELETE /api/v1/competition-templates/:id`

Drafts:

- `GET /api/v1/competition-drafts?eventOrganizerId=...`
- `POST /api/v1/competition-drafts`
- `GET /api/v1/competition-drafts/:id`
- `PATCH /api/v1/competition-drafts/:id`
- `DELETE /api/v1/competition-drafts/:id`
- `GET /api/v1/competition-drafts/:id/preview`
- `POST /api/v1/competition-drafts/:id/publish`

Formats:

- `GET /api/v1/competition-formats?eventOrganizerId=...`

Participants:

- `GET /api/v1/competitions/:id/participants`
- `POST /api/v1/competitions/:id/participants`
- `POST /api/v1/competitions/:id/participants/import`

Scheduling:

- `POST /api/v1/competitions/:id/schedule/round-robin`

Analytics:

- `GET /api/v1/competitions/:id/analytics`

## UI (EO Dashboard)

Wizard:

- Page: `/competitions/new`
- Supports:
  - template selection
  - draft save per step
  - preview
  - publish

## Operational Notes

Key management:

- For sensitive data (PII), see [SECURITY_HARDENING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/SECURITY_HARDENING.md)

ERD:

- Regenerate diagrams after applying migrations: [ERD.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/ERD.md)

