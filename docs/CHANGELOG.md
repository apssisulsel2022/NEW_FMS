# Changelog

Format:

- Tanggal (YYYY-MM-DD)
  - Added / Changed / Fixed
  - Dampak
  - File/Module terkait

## 2026-03-10

- Added
  - Schema PostgreSQL multi-tenant + RLS + RBAC + tabel domain inti (competition, teams, matches, events, standings) + automation jobs + trigger publish competition.
  - Enterprise database extension (120–150 tabel) termasuk partitioning untuk tabel high-volume, RBAC granular, data dictionary generator, benchmarking harness, dan playbooks operasional.
  - Database audit toolkit untuk metrik performa (storage, index usage, IO, lock contention, autovacuum, slow queries), laporan audit, indeks optimasi online (CONCURRENTLY), dan monitoring/alert playbook.
  - Indexing strategy package: audit queries untuk storage overhead/unused indexes, indeks tambahan online (v2), prosedur REINDEX CONCURRENTLY, dan dokumen strategi index berbasis query patterns.
  - Data integrity package: pemetaan FK, deteksi orphan, deteksi missing FK indexes, checklist deployment, test suite SQL (no orphans + FK indexes), serta constraint tambahan berbasis domain (NOT VALID + validate).
  - Competition core models: format, category, season, organizer profile extensions, hosting records, audit trails, tenant-safe constraints, serta spesifikasi API CRUD.
  - Competition creation system module: drafts + preview, templates, participant import, scheduling generator, notifications on publish, status history, analytics view, and RLS hardening for core tenant tables.
  - Team registration system module: team profiles + roles, invitation tokens, team competition registration requests, organizer approval workflow, CSV export, competition discovery filters, and participant notifications.
  - Player registration system module: roster management APIs/UI, player profile extensions, eligibility validation (age + max roster size), CSV import/export, roster status tracking, audit trails, and realtime roster updates.
  - Service layer Supabase untuk competitions/teams/matches + automation worker + round-robin fixture generator.
  - 3 aplikasi Next.js: public web, EO dashboard, admin dashboard (shell).
  - API routes di EO dashboard untuk competitions/teams/matches + publish + match events.
  - REST API v1 terstruktur (users, competitions, teams, players, matches, statistics, media) dengan versioning, pagination, filtering/sorting/search, rate limiting, dan error format konsisten.
  - Tenant selector (list Event Organizers milik user) untuk mendukung multi-tenant workflow di EO dashboard.
  - Public page `/competition/[slug]` untuk menampilkan standings dan fixtures dari competition yang sudah publish.
  - Dokumen arsitektur lengkap sistem (frontend, backend, database, realtime, AI).
  - Dokumen modularisasi sistem (competitions, teams, players, matches, statistics, referees, media, AI).
  - Dokumen struktur proyek production-ready (frontend, backend, database, realtime, AI).
- Dampak
  - Sistem sudah punya foundation end-to-end: tenant -> create competition -> publish -> (job enqueue) -> public read.
- Terkait
  - Database: [database/migrations/001_init.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/001_init.sql)
  - Database: [database/migrations/002_enterprise.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/002_enterprise.sql)
  - Database: [database/migrations/003_enterprise_ext.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/003_enterprise_ext.sql)
  - Backend: [backend/services](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/backend/services)
  - Apps: [apps](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps)
  - Docs: [docs/SYSTEM_ARCHITECTURE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/SYSTEM_ARCHITECTURE.md)
  - Docs: [docs/MODULES.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/MODULES.md)
  - Docs: [docs/PROJECT_STRUCTURE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/PROJECT_STRUCTURE.md)
  - Docs: [docs/API_V1.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/API_V1.md)
  - Docs: [docs/DATABASE_ENTERPRISE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/DATABASE_ENTERPRISE.md)
  - Docs: [docs/ERD.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/ERD.md)
  - Docs: [docs/DATA_DICTIONARY.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/DATA_DICTIONARY.md)
