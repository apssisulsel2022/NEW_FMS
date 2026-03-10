# Database & RLS

Schema utama berada di: [database/migrations/001_init.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/001_init.sql)

## Extension

- `pgcrypto` untuk `gen_random_uuid()`

## Tabel Penting

### Identity & RBAC

- `public.roles`: master role (seeded)
- `public.profiles`: profile user (FK ke `auth.users`)
- `public.user_roles`: mapping user -> role

### Multi-tenant

- `public.event_organizers`: tenant
- `public.event_organizer_members`: membership user ke tenant

## Pola Multi-Tenant (Wajib)

- Semua tabel domain tenant memiliki `event_organizer_id` dan RLS wajib aktif.
- Semua operasi write dari aplikasi harus mengisi `event_organizer_id`.
- Semua query tenant di aplikasi sebaiknya selalu mem-filter `event_organizer_id` (defense-in-depth), walaupun RLS sudah membatasi hasil.
- Untuk kebutuhan public website, gunakan field publish (`published_at`) + policy `anon` yang hanya mengizinkan data published.

### Domain inti

- `public.competitions`: kompetisi (punya `published_at`)
- `public.teams`: tim per kompetisi
- `public.matches`: jadwal + score
- `public.match_events`: event pertandingan (goal, card, dll)
- `public.standings`: klasemen (per competition + team)

### Automation

- `public.automation_jobs`: antrean job

## RLS (Row Level Security)

Semua tabel domain tenant mengaktifkan RLS. Prinsipnya:

- Authenticated (EO/staff): boleh CRUD jika member tenant
- Anon (public): boleh SELECT hanya untuk data yang sudah published

Helper:

- `public.is_event_organizer_member(event_organizer_id uuid) returns boolean`

Prinsip policy yang dipakai:

- Tenant tables: `using (public.is_event_organizer_member(event_organizer_id))`
- Tenant write check: `with check (public.is_event_organizer_member(event_organizer_id))`
- Public read tables (published): policy `anon` menggunakan join ke `competitions.published_at is not null` atau filter langsung ke row published.

## Publish Competitions → Enqueue Jobs

- Ketika `competitions.published_at` berubah dari null -> not null, trigger:
  - insert beberapa row ke `automation_jobs`

Implementasi:

- Trigger: `competitions_enqueue_publish_jobs`
- Function: `public.enqueue_competition_publish_jobs()`

## Checklist Setup Tenant (Minimum)

1. Buat user di Supabase Auth (email/password).
2. Insert `public.profiles` untuk user tersebut (id = auth.users.id). Bisa dilakukan dari client (policy allow upsert self).
3. Buat tenant:
   - Insert `public.event_organizers` dengan `owner_user_id = auth.users.id`
4. Tambahkan membership:
   - Insert `public.event_organizer_members` untuk `event_organizer_id` tersebut dan `user_id = auth.users.id`
