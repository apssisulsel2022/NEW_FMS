# Competition Core Data Models

This document defines the four core data models used to operate a multi-tenant competition management system:

- Organizers (tenants)
- Competition categories
- Seasons
- Competition formats

All entities are designed for multi-tenant deployments and enforce integrity through constraints, foreign keys, and RLS policies.

## 1) Organizers

Table:

- `public.event_organizers`

Key fields:

- `owner_user_id`: creator/owner
- `name`, `slug`: identity (slug is globally unique)
- `legal_name`, `website`, `contact_email`, `contact_phone`, `address`, `country`
- `accreditation_status`, `accredited_at`, `accreditation_meta`

Relationships:

- Organizer → many competitions (`competitions.event_organizer_id`)
- Organizer → many categories (`competition_categories.event_organizer_id`)
- Organizer → many seasons (`seasons.event_organizer_id`)
- Organizer → many formats (`competition_formats.event_organizer_id`, nullable for global templates)
- Organizer → many hosting records (`organizer_hosting_records.event_organizer_id`)

Integrity and tenancy:

- RLS policies limit access to members/owners via `public.is_event_organizer_member(...)`.
- Hosting history is preserved using `competition_id on delete set null` to keep historical records when competitions are removed.

## 2) Competition Categories

Table:

- `public.competition_categories`

Key fields:

- `event_organizer_id`: tenant key
- `name`, `slug`
- Classification fields:
  - `category_type` (e.g., league/cup/friendly)
  - `discipline` (e.g., football/futsal/basketball)
  - `age_group_min`, `age_group_max`
  - `skill_level` (e.g., amateur/pro)
  - `gender`
  - `meta` (extensible attributes)

Validation:

- `competition_categories_age_group_ck`: `age_group_min <= age_group_max` when both provided

Relationships:

- Category → many competitions (`competitions.category_id on delete set null`)

Indexes:

- Existing: `competition_categories_event_organizer_id_idx`
- Uniqueness: `(event_organizer_id, slug)`

## 3) Seasons

Tables:

- `public.seasons`
- `public.competition_seasons` (join table)
- `public.team_seasons` (join table)

Key fields:

- `event_organizer_id`: tenant key
- `name`
- `starts_on`, `ends_on`
- Registration window:
  - `registration_opens_at`, `registration_closes_at`
- `timezone`
- `scheduling_constraints` (extensible JSONB)

Validation:

- `seasons_registration_window_ck`: `registration_opens_at <= registration_closes_at` when both provided

Relationships:

- Season ↔ Competition: `competition_seasons (competition_id, season_id)`
- Season ↔ Team: `team_seasons (team_id, season_id)`

Indexes:

- Existing: `seasons_event_organizer_id_idx`
- Join-table indexes exist in migrations for fast membership lookups.

## 4) Competition Formats

Tables:

- `public.competition_formats`
- `public.competition_format_rules`

Key fields:

- `event_organizer_id`: tenant key, nullable for global templates
- `code`, `name`
- `format_type` enum: `single_elimination`, `double_elimination`, `round_robin`, `league`, `group_stage`, `swiss`, `hybrid`
- `rules` (JSONB) and key-based `competition_format_rules` for structured rule storage

Relationships:

- Format → many competitions (`competitions.competition_format_id on delete set null`)
- Format → many rules (`competition_format_rules.format_id on delete cascade`)

Tenant safety:

- `validate_competition_format_tenant` prevents assigning a tenant-scoped format to a competition in a different tenant.
- `sync_competition_format_rule_tenant` aligns rules’ tenant key to their parent format.

Indexes:

- Tenant and type: `competition_formats_event_organizer_id_idx`, `competition_formats_format_type_idx`
- Global uniqueness: partial unique index `competition_formats_global_code_uq` on `(code)` where `event_organizer_id is null`

## Audit Trails

Changes to:

- `event_organizers`, `competition_categories`, `seasons`, `competition_formats`, `competition_format_rules`, `organizer_hosting_records`

are recorded into `public.audit_log` via the trigger function `public.audit_row_change()`.

## ERD

Generate ERD diagrams (SVG/PNG) from a live database instance:

- [ERD.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/ERD.md)

