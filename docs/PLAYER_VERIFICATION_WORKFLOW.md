# Player Verification Workflow

This module enables Event Organizers to authenticate and validate player identities before tournament participation, with support for document uploads, AI fraud checks (queued), decisions, appeals, notifications, audit trails, and metrics.

## Database

Migration:

- [010_player_verification_workflow.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/010_player_verification_workflow.sql)

Tables:

- `player_verification_requests`
- `player_verification_documents` (encrypted payload stored server-side)
- `player_verification_events`
- `player_verification_metrics_summary` view

Player fields:

- `players.verification_status` (`unverified` by default; set to `verified` on approval)
- `players.verified_at`, `players.verified_by_user_id`, `players.last_verification_request_id`

## Security & Privacy

- Documents are encrypted in the API using `FMS_PII_ENCRYPTION_KEY` (AES-256-GCM) before being stored in `player_verification_documents.content_encrypted`.
- Document integrity is tracked using SHA256 hashes.
- RLS:
  - organizer members can manage verification data scoped to their `event_organizer_id`
  - team members can access requests/documents linked to their `team_profile_id`
- Audit trails:
  - row-change audit triggers are enabled for all verification tables
  - explicit `player_verification_events` captures human actions and rationale

## Workflow

1. Create request (organizer staff or team captain/manager)
2. Upload required documents:
   - `government_id_front`
   - `selfie` or `live_capture`
3. Submit for review:
   - request becomes `submitted`
   - duplicate signals are computed (same email / same NIK HMAC if available)
   - an outbox event is emitted (`player.verification.submitted`) for AI checks
4. Decision:
   - organizer `owner/admin` approves or rejects
   - player verification status is updated on `players`
   - notifications:
     - in-app notifications to the team
     - email job is queued via `outbox_events` if player email exists
5. Appeal:
   - team captain/manager can submit an appeal for rejected requests

## API (EO Dashboard, v1)

- `GET /api/v1/player-verifications?eventOrganizerId=...` (organizer queue)
- `GET /api/v1/player-verifications?teamProfileId=...` (team tracking)
- `POST /api/v1/player-verifications` (create request)
- `GET /api/v1/player-verifications/:id`
- `GET /api/v1/player-verifications/:id/documents`
- `POST /api/v1/player-verifications/:id/documents` (encrypted upload)
- `GET /api/v1/player-verifications/:id/documents/:docId` (decrypt + return base64)
- `POST /api/v1/player-verifications/:id/submit`
- `POST /api/v1/player-verifications/:id/decision`
- `POST /api/v1/player-verifications/:id/appeal`
- `GET /api/v1/player-verifications/:id/events`

## UI (EO Dashboard)

- Organizer dashboard:
  - `/player-verifications`
  - `/player-verifications/:id`
- Team view:
  - `/my-teams/:id/verifications`

## AI Fraud Detection (current implementation)

- The system queues AI checks via outbox events and stores preliminary duplicate signals in `ai_result`.
- Facial recognition and document OCR validation require a dedicated worker that consumes `outbox_events` (topic: `player.verification.submitted`) and writes results back to `player_verification_requests.ai_result`.

