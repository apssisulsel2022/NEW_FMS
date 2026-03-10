# API (EO Dashboard)

API berada di `apps/eo-dashboard` (Next.js Route Handlers). Semua endpoint membutuhkan header:

- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

Token diambil dari Supabase Auth session pada client (`apps/eo-dashboard`).

## Competitions

### GET /api/competitions?eventOrganizerId=UUID

Response:

- `200 { data: Competition[], count: number }`

Implementasi:

- [apps/eo-dashboard/src/app/api/competitions/route.ts](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps/eo-dashboard/src/app/api/competitions/route.ts)

### POST /api/competitions

Body:

- `eventOrganizerId` (required)
- `name` (required)
- `slug` (required)
- `season` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `categoryId` (optional)

Response:

- `200 { data: Competition }`

### POST /api/competitions/:id/publish

Efek:

- Set `competitions.published_at = now()`
- Database trigger enqueue jobs ke `automation_jobs`

Implementasi:

- [apps/eo-dashboard/src/app/api/competitions/[id]/publish/route.ts](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps/eo-dashboard/src/app/api/competitions/%5Bid%5D/publish/route.ts)

## Teams

### GET /api/teams?competitionId=UUID

Response:

- `200 { data: Team[], count: number }`

### POST /api/teams

Body:

- `eventOrganizerId` (required)
- `competitionId` (required)
- `name` (required)
- `slug` (required)
- `logoPath` (optional)

Implementasi:

- [apps/eo-dashboard/src/app/api/teams/route.ts](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps/eo-dashboard/src/app/api/teams/route.ts)

## Matches

### GET /api/matches?competitionId=UUID

Response:

- `200 { data: Match[], count: number }`

### POST /api/matches

Body:

- `eventOrganizerId` (required)
- `competitionId` (required)
- `homeTeamId` (required)
- `awayTeamId` (required)
- `scheduledAt` (optional, ISO string)
- `venue` (optional)

Implementasi:

- [apps/eo-dashboard/src/app/api/matches/route.ts](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps/eo-dashboard/src/app/api/matches/route.ts)

## Match Events

### POST /api/matches/:id/events

Body:

- `eventOrganizerId` (required)
- `eventType` (required)
- `teamId` (optional)
- `playerId` (optional)
- `minute` (optional)
- `second` (optional)
- `payload` (optional JSON)

Implementasi:

- [apps/eo-dashboard/src/app/api/matches/[id]/events/route.ts](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps/eo-dashboard/src/app/api/matches/%5Bid%5D/events/route.ts)

