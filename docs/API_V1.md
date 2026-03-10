# API v1 (REST)

Base path: `/api/v1`

Semua endpoint menggunakan JSON untuk request/response dan mengikuti konvensi REST (resource + HTTP methods).

## Auth & Authorization

- Header wajib:
  - `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- Authorization utama: Postgres RLS (tenant isolation)
- Authorization tambahan:
  - Endpoint memvalidasi parameter minimal (misal `eventOrganizerId`, `competitionId`)

## Versioning

- Versioning via URL prefix: `/api/v1/...`
- Perubahan breaking akan dibuat sebagai `/api/v2/...` dan v1 dipertahankan selama masa deprecation.

## Rate Limiting

- API mengembalikan header:
  - `x-ratelimit-limit`
  - `x-ratelimit-remaining`
  - `x-ratelimit-reset` (unix epoch seconds)
- Jika limit terlewati:
  - `429 Too Many Requests`

Catatan produksi:

- Implementasi saat ini memakai in-memory window per instance (cocok untuk dev/single instance).
- Untuk production multi-instance, gunakan Redis/Upstash sebagai backend limiter.

## Error Format

Response error selalu berbentuk:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "competitionId is required",
    "details": null
  }
}
```

Status code yang umum:

- `400` invalid request/validation
- `401` unauthorized (token invalid/missing)
- `403` forbidden (RLS/permission)
- `404` not found
- `409` conflict (unique constraint)
- `429` rate limited
- `500` internal error

## Pagination

List endpoints mendukung:

- `limit` + `offset`
- atau `page` + `perPage`

Response list:

```json
{
  "data": [],
  "meta": { "limit": 50, "offset": 0, "count": 123 }
}
```

## Sorting, Filtering, Search

- Sorting:
  - `sortBy=<field>`
  - `sortOrder=asc|desc`
- Search:
  - `q=<keyword>` atau `search=<keyword>`
- Filtering:
  - per-resource (contoh: `status`, `matchStatus`, `mediaType`)

## Resource Groups

### 1) Users

- `GET /users/me` → profile user (RLS self)
- `POST /users/me` → create/upsert profile (self)
- `PUT /users/me` → replace/upsert profile (self)
- `PATCH /users/me` → partial update profile (self)
- `DELETE /users/me` → soft delete (set `profiles.status = 'deleted'`)
- `GET /users/me/roles` → daftar role milik user
- `GET /users/me/event-organizers` → daftar tenant (EO) yang user menjadi member-nya

### 2) Competitions

- `GET /competitions?eventOrganizerId=UUID`
- `POST /competitions`
- `GET /competitions/:id`
- `PUT /competitions/:id`
- `PATCH /competitions/:id`
- `DELETE /competitions/:id`
- `POST /competitions/:id/publish`

Query params list:

- `limit, offset, page, perPage`
- `q`
- `status`
- `sortBy=created_at|name|published_at`
- `sortOrder=asc|desc`

### 3) Teams

- `GET /teams?competitionId=UUID`
- `POST /teams`
- `GET /teams/:id`
- `PUT /teams/:id`
- `PATCH /teams/:id`
- `DELETE /teams/:id`

Query params list:

- `q`
- `status`
- `sortBy=created_at|name`
- `sortOrder=asc|desc`

### 4) Players

- `GET /players?eventOrganizerId=UUID`
- `POST /players`
- `GET /players/:id`
- `PUT /players/:id`
- `PATCH /players/:id`
- `DELETE /players/:id`

Query params list:

- `q` (search first_name/last_name)
- `status`
- `sortBy=created_at|last_name|first_name`
- `sortOrder=asc|desc`

### 5) Matches

- `GET /matches?competitionId=UUID`
- `POST /matches`
- `GET /matches/:id`
- `PUT /matches/:id`
- `PATCH /matches/:id`
- `DELETE /matches/:id`
- `GET /matches/:id/events`
- `POST /matches/:id/events`

Query params list:

- `q` (search venue)
- `matchStatus`
- `sortBy=scheduled_at|created_at`
- `sortOrder=asc|desc`

Events query params:

- `limit, offset`
- `sortOrder=asc|desc`

### 6) Statistics

Standings:

- `GET /statistics/standings?competitionId=UUID`
- `POST /statistics/standings`
- `GET /statistics/standings/:id`
- `PUT /statistics/standings/:id`
- `PATCH /statistics/standings/:id`
- `DELETE /statistics/standings/:id`

Player statistics:

- `GET /statistics/player-statistics?eventOrganizerId=UUID&competitionId=&teamId=&playerId=`
- `POST /statistics/player-statistics`
- `GET /statistics/player-statistics/:id`
- `PUT /statistics/player-statistics/:id`
- `PATCH /statistics/player-statistics/:id`
- `DELETE /statistics/player-statistics/:id`

Competition statistics:

- `GET /statistics/competition-statistics?eventOrganizerId=UUID`
- `POST /statistics/competition-statistics`
- `GET /statistics/competition-statistics/:id`
- `PUT /statistics/competition-statistics/:id`
- `PATCH /statistics/competition-statistics/:id`
- `DELETE /statistics/competition-statistics/:id`

### 7) Media

- `GET /media?eventOrganizerId=UUID&competitionId=&matchId=&mediaType=`
- `POST /media`
- `GET /media/:id`
- `PUT /media/:id`
- `PATCH /media/:id`
- `DELETE /media/:id`

## Notes on Tenancy

- Semua endpoint tenant-scoped menerima `eventOrganizerId` atau relasi (`competitionId`) untuk membatasi query.
- RLS memastikan user tidak bisa akses tenant lain walaupun mencoba ganti parameter.

