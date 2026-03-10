# Arsitektur

## Ringkasan

Sistem ini adalah FMS multi-tenant dengan Event Organizer (EO) sebagai tenant. Akses data tenant diisolasi lewat RLS (Row Level Security) di Postgres (Supabase).

## Komponen

- Database (Supabase Postgres)
  - Menyimpan data domain inti (competitions, teams, matches, match_events, standings, dll)
  - RLS memastikan user hanya bisa akses data tenant yang dia menjadi member-nya
- Auth (Supabase Auth)
  - Login via email/password (EO dashboard)
  - JWT access token dipakai untuk request ke API routes (Next.js) yang meneruskan token ke Supabase
- Service layer (Node/TypeScript)
  - Lokasi: [backend/services](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/backend/services)
  - Berisi fungsi domain untuk query Supabase
- Frontend apps (Next.js App Router)
  - `apps/web`: public website untuk anon (hanya data publish)
  - `apps/eo-dashboard`: dashboard EO (CRUD, butuh login)
  - `apps/admin-dashboard`: shell admin

## Multi-Tenancy (Tenant = Event Organizer)

- Setiap record domain utama menyimpan `event_organizer_id`
- User dianggap member tenant jika ada row aktif di `event_organizer_members`
- Helper function: `public.is_event_organizer_member(event_organizer_id)`
- RLS policy (umum): `using (public.is_event_organizer_member(event_organizer_id))`

## Alur Utama

### 1) EO membuat kompetisi

- EO login di `apps/eo-dashboard`
- UI memanggil `POST /api/competitions`
- API route membuat Supabase client dengan header Authorization dari user
- Insert ke tabel `public.competitions`

### 2) Publish kompetisi

- UI memanggil `POST /api/competitions/:id/publish`
- Update `competitions.published_at = now()`
- Trigger database enqueue jobs di `automation_jobs`:
  - `fixture_generate`
  - `standings_initialize`
  - `website_enable` (placeholder)
  - `media_enable` (placeholder)

### 3) Public website menampilkan kompetisi

- User mengakses `/competition/[slug]` di `apps/web`
- Query ke Supabase memakai anon key (read-only)
- RLS untuk `anon` hanya mengizinkan data published (policy public)

## Realtime (Match Events)

- Tabel event: `public.match_events`
- Public website bisa subscribe perubahan (INSERT) untuk live event stream
- Hook client: [useLiveMatch](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/apps/web/src/lib/useLiveMatch.tsx)

