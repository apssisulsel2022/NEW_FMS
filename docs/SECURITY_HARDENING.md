# Security Hardening (RLS, RBAC, Encryption)

## RLS (Row Level Security)

Tenancy is modeled by `public.event_organizers`. Tenant-scoped tables include `event_organizer_id` and are protected by RLS policies using:

- `public.is_event_organizer_member(event_organizer_id)` for authenticated access

Published data can be exposed to anonymous users only through explicit policies on published entities (competitions/teams/matches/standings, etc).

## RBAC (Role-Based Access Control)

Global RBAC:

- `public.roles` and `public.user_roles` define global roles
- `public.permissions` and `public.role_permissions` define permission mapping
- `public.is_super_admin()` is used for super-admin gated mutation of global reference data

Tenant RBAC:

- `public.event_organizer_roles`
- `public.event_organizer_user_roles`

These tables allow per-tenant role modeling beyond the global roles used for platform-level governance.

## Encryption at Rest (Application-Level)

Postgres encryption at rest is ultimately enforced by infrastructure (disk encryption / managed database). For sensitive payloads stored in-row, use application-level encryption:

- Functions:
  - `public.encrypt_jsonb(jsonb) -> bytea`
  - `public.decrypt_jsonb(bytea) -> jsonb`
- Script: [01_hardening.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/security/01_hardening.sql)

Key management:

- The encryption key is not stored in the database schema.
- The key must be injected at runtime via `SET app.encryption_key = '...'` in a trusted server context only.

Recommended usage:

- Store encrypted payload in `bytea` columns (example: `player_biometrics.encrypted_payload`).
- Keep non-sensitive metadata in `jsonb meta` columns to preserve queryability.

## PII: Player NIK

NIK is stored in application-level encrypted form in `public.players`:

- `nik_encrypted`: AES-256-GCM encrypted payload (versioned string)
- `nik_hmac`: keyed HMAC-SHA256 for uniqueness checks per tenant
- `nik_last4`: last 4 digits for UI display

Key management:

- The key is provided via server environment variable `FMS_PII_ENCRYPTION_KEY`.
- The full NIK value is never returned by API responses; only `nik_last4` is exposed.
