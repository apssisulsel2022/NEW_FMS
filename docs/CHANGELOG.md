# Changelog

Format:

- Tanggal (YYYY-MM-DD)
  - Added / Changed / Fixed
  - Dampak
  - File/Module terkait

## 2026-03-10

- Added
  - Schema PostgreSQL multi-tenant + RLS + RBAC + tabel domain inti (competition, teams, matches, events, standings) + automation jobs + trigger publish competition.
  - Service layer Supabase untuk competitions/teams/matches + automation worker + round-robin fixture generator.
  - 3 aplikasi Next.js: public web, EO dashboard, admin dashboard (shell).
  - API routes di EO dashboard untuk competitions/teams/matches + publish + match events.
  - Tenant selector (list Event Organizers milik user) untuk mendukung multi-tenant workflow di EO dashboard.
  - Public page `/competition/[slug]` untuk menampilkan standings dan fixtures dari competition yang sudah publish.
  - Dokumen arsitektur lengkap sistem (frontend, backend, database, realtime, AI).
  - Dokumen modularisasi sistem (competitions, teams, players, matches, statistics, referees, media, AI).
  - Dokumen struktur proyek production-ready (frontend, backend, database, realtime, AI).
- Dampak
  - Sistem sudah punya foundation end-to-end: tenant -> create competition -> publish -> (job enqueue) -> public read.
- Terkait
  - Database: [database/migrations/001_init.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/001_init.sql)
  - Backend: [backend/services](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/backend/services)
  - Apps: [apps](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps)
  - Docs: [docs/SYSTEM_ARCHITECTURE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/SYSTEM_ARCHITECTURE.md)
  - Docs: [docs/MODULES.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/MODULES.md)
  - Docs: [docs/PROJECT_STRUCTURE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/PROJECT_STRUCTURE.md)
