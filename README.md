# NEW_FMS

Platform Football Management System (FMS) berbasis multi-tenant (Event Organizer sebagai tenant) dengan 3 aplikasi:

- Public website: `apps/web`
- Event Organizer dashboard: `apps/eo-dashboard`
- Admin dashboard: `apps/admin-dashboard`

Backend logic ada di folder `backend/` (service layer) dan schema database ada di `database/migrations/`.

## Struktur Folder

- `apps/`
  - `web/` Public competition website (read-only untuk anon, hanya data yang sudah publish)
  - `eo-dashboard/` Dashboard EO (CRUD tenant, butuh login Supabase)
  - `admin-dashboard/` Dashboard admin (shell)
- `backend/services/` Service layer (Supabase client + domain services)
- `database/migrations/` SQL migrations (schema + RLS + triggers)
- `ai/fixture-generator/` Algoritma generator fixture
- `modules/` Wrapper tipe + re-export service per domain
- `docs/` Dokumentasi proyek dan changelog

## Prasyarat

- Node.js (disarankan LTS terbaru)
- Proyek Supabase (Postgres + Auth)

## Environment Variables

Set untuk masing-masing app (`apps/web`, `apps/eo-dashboard`, `apps/admin-dashboard`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Setup Database (Supabase)

- Jalankan migration: [001_init.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/001_init.sql)
- Pastikan Realtime Supabase aktif untuk tabel `public.match_events` jika ingin live update di public website.

## Jalankan Lokal

Di root:

- Install dependency:
  - `npm install`
- Jalankan app:
  - `npm run dev:web`
  - `npm run dev:eo`
  - `npm run dev:admin`

Port default:

- `apps/web`: 3000
- `apps/admin-dashboard`: 3001
- `apps/eo-dashboard`: 3002

## Scripts

Root scripts (workspace):

- `npm run dev:web` / `dev:eo` / `dev:admin`
- `npm run build:web` / `build:eo` / `build:admin`
- `npm run lint:web` / `lint:eo` / `lint:admin`
- `npm run typecheck:web` / `typecheck:eo` / `typecheck:admin`

## Dokumentasi & Perubahan

- Changelog: [docs/CHANGELOG.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/CHANGELOG.md)
- Index docs: [docs/README.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/README.md)

