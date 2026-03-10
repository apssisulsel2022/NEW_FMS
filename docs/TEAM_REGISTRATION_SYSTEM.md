# Team Registration System

This module enables teams to create profiles, invite members, register for competitions, and manage participation, while allowing event organizers to review and approve registrations.

## Database

Migration:

- [008_team_registration_system.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/008_team_registration_system.sql)

Tables:

- `team_profiles`: team identity owned by a user (captain)
- `team_members`: membership and roles (`captain`, `manager`, `player`)
- `team_invitations`: token-based invitations (stored as SHA256 hash)
- `competition_participants` extended:
  - `team_profile_id` for team registrations
  - `registration_status` used as `pending/approved/denied`
- `teams` extended:
  - `team_profile_id` for linking approved registrations to competition teams used in fixtures

## Security

- RLS enabled on team tables; access is restricted to authenticated members via `public.is_team_member(team_profile_id)`.
- Invitations store only token hashes; tokens are shown once at creation.

## API (EO Dashboard, v1)

Teams:

- `GET /api/v1/team-profiles` (my teams)
- `POST /api/v1/team-profiles` (create team profile; captain auto-created)
- `GET /api/v1/team-profiles/:id`
- `PATCH /api/v1/team-profiles/:id`
- `DELETE /api/v1/team-profiles/:id`
- `GET /api/v1/team-profiles/:id/members`
- `PATCH /api/v1/team-profiles/:id/members` (captain only; role changes)
- `DELETE /api/v1/team-profiles/:id/members?memberId=...` (captain only)
- `GET /api/v1/team-profiles/:id/invitations`
- `POST /api/v1/team-profiles/:id/invitations` (captain/manager; returns token once)
- `POST /api/v1/team-invitations/accept`

Competition discovery & registration:

- `GET /api/v1/competitions/discover` (filters: q, categoryId, date, prize, skillLevel)
- `POST /api/v1/competitions/:id/register` (team submits registration request)
- `GET /api/v1/team-profiles/:id/registrations`
- `POST /api/v1/competitions/:id/messages` (team → organizer message via notifications)

Organizer review:

- `GET /api/v1/competitions/:id/registrations?registrationStatus=pending`
- `PATCH /api/v1/competitions/:id/registrations/:participantId` (approve/deny)
- `GET /api/v1/competitions/:id/registrations/export` (CSV)

## UI (EO Dashboard)

- Team portal:
  - `/my-teams`
  - `/my-teams/:id`
  - `/discover`
- Organizer registration review:
  - `/competitions/:id/registrations`

## Payments

- Entry fee fields exist on `competitions`.
- Registrations are created with `payment_status = payment_required` when `entry_fee_cents > 0`.
- Payment provider checkout/intents are not implemented yet in this repository.

