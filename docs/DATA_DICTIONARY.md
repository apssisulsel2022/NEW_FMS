# Data Dictionary

This document defines shared column semantics, domains, and business rules for the PostgreSQL schema. A full table/column dump can be generated directly from the database for the currently deployed version.

## Shared Columns

Most tables follow a standardized shape:

- `id uuid` primary key, default `gen_random_uuid()`
- `created_at timestamptz` creation timestamp, default `now()`
- `updated_at timestamptz` update timestamp, maintained by `public.set_updated_at()` trigger
- `status public.fms_status` lifecycle state
- `event_organizer_id uuid` tenant key for multi-tenant isolation (where applicable)

## Core Domains

- Tenant: `public.event_organizers`
- User: `auth.users` (Supabase Auth), profile shadow: `public.profiles`
- RBAC (global): `public.roles`, `public.user_roles`, `public.permissions`, `public.role_permissions`
- Tenant RBAC: `public.event_organizer_roles`, `public.event_organizer_user_roles`

## Business Rules (High-Level)

- Tenancy isolation: any table containing `event_organizer_id` must be protected by RLS so users can only access rows for tenants they belong to.
- Competition publication: public read access (anon) is allowed only for published competitions (`competitions.published_at is not null`) and active status.
- Immutability at scale: high-volume log tables are append-mostly; updates should be avoided.
- Partitioning: high-volume tables are partitioned by `created_at` to support retention management and consistent query performance at 100M+ rows.

## Major Entities (Conceptual)

Users

- `profiles`: user profile metadata
- `user_roles`: global roles assignment

Competitions

- `competitions`: top-level competition
- `competition_stages`: stage boundaries (league, group, knockout)
- `competition_groups`: group boundaries within stage
- `competition_rounds`: round boundaries within stage
- `round_matches`: assignment of matches to rounds

Teams & Players

- `teams`: team registry per competition
- `players`: player registry per tenant
- `team_players`: roster membership
- `player_contracts`, `player_transfers`: lifecycle tracking

Matches & Events

- `matches`: fixtures and results
- `match_events`: simple event feed (legacy)
- `match_event_stream`: partitioned event stream for high-volume usage
- `match_lineups_v2`, `match_lineup_players`: normalized lineup model

Statistics

- `standings`: table standings per competition/team
- `player_statistics`, `match_player_statistics_v2`: aggregate and per-match stats
- `stat_definitions`: canonical metric definitions

Media

- `generated_media`: generated outputs (legacy)
- `media_assets`: canonical media objects with variants and rights
- `media_access_log`: partitioned access logging

## Generate Full Dictionary From a Live Database

Use:

- SQL generator: [generate_data_dictionary.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/generate_data_dictionary.sql)

Run it in `psql` and redirect output to a markdown file for the exact database instance/version.

