# Production-Ready Project Structure

This document proposes a production-ready structure for a multi-tenant football competition platform covering frontend, backend, database, realtime, and AI modules. It is designed to scale from the current repo layout to a larger organization without forcing a big-bang refactor.

## Principles

- Monorepo with clear boundaries: apps vs packages vs services.
- Domain-first modules: competitions, teams, players, matches, statistics, referees, media, AI.
- Multi-tenant isolation primarily enforced in Postgres RLS.
- Event-driven where it matters: match events stream → projections (statistics/media/AI).
- Incremental adoption: existing paths remain valid; new structure provides landing zones.

## Target Top-Level Layout

```text
NEW_FMS/
  apps/
    web/                       # Public website (read-only published data)
    eo-dashboard/              # Event Organizer dashboard (authenticated, tenant-aware)
    admin-dashboard/           # Platform admin dashboard (privileged)
  packages/
    ui/                        # Shared UI components (optional)
    shared/                    # Shared types, constants, helpers
    config/                    # Shared eslint/tsconfig/tailwind presets (optional)
  services/
    api/                       # Dedicated API service (optional; can come later)
    workers/
      automation-worker/       # Job runner for automation_jobs/queue
      stats-worker/            # Standings/stat projections from matches/events
      media-worker/            # Media processing pipeline
      ai-worker/               # Batch inference/training jobs
    realtime-gateway/          # Optional WS gateway if outgrowing DB-realtime
  backend/
    services/                  # Domain service layer (repo currently uses this)
    lib/                       # Core runtime utilities (authz helpers, ids, errors)
    db/                        # DB access helpers (query builders, migrations helpers)
  modules/
    competitions/
    teams/
    players/
    matches/
    statistics/
    referees/
    media/
    ai/
    event-organizers/
  database/
    migrations/                # SQL migrations
    seeds/                     # Seed scripts (optional)
    policies/                  # RLS policy reference (optional)
  ai/
    fixture-generator/         # Algorithmic utilities used by workers/services
    pipelines/                 # Feature extraction, batch inference (optional)
  infra/
    terraform/                 # IaC (optional)
    docker/                    # Dockerfiles + compose (optional)
    ci/                        # CI pipelines (optional)
  docs/
    ...                        # Architecture, modules, API, DB, changelog, structure
  scripts/                     # Operational scripts (optional)
```

## How This Maps to the Current Repo

Current repo already has:

- `apps/web`, `apps/eo-dashboard`, `apps/admin-dashboard`
- `backend/services/*` domain services
- `database/migrations/001_init.sql`
- `ai/fixture-generator/*`
- `modules/*` wrappers for domain types and service re-exports

Recommended next steps do not require moving these immediately:

- Keep `backend/services/*` as the authoritative domain service layer.
- Add workers as separate deployable units under `services/workers/*` when automation expands.
- Gradually move shared types to `packages/shared` and re-export from `modules/*` for stability.

## Frontend Structure (per app)

Each app should follow a consistent internal layout:

```text
apps/<app>/
  src/
    app/                       # Next.js routes (App Router)
    components/                # Reusable UI components
    lib/                       # Client utilities (supabase client, hooks)
    services/                  # Client-side API wrappers (fetchers)
    types/                     # App-local types (avoid if shared)
  public/
  package.json
  tsconfig.json
```

Guidance:

- Public app consumes anon supabase client and only published data.
- EO dashboard is tenant-aware and should always operate under an active tenant selection.
- Admin app should never rely on tenant RLS alone; it needs explicit role gating.

## Backend Structure (Domain + API)

### Domain services (current approach)

```text
backend/services/
  competitions.ts
  teams.ts
  players.ts                  # to be added
  matches.ts
  statistics.ts               # to be added
  referees.ts                 # to be added
  media.ts                    # to be added
  ai.ts                       # to be added
  eventOrganizers.ts
  supabase.ts                 # client factory
  automation.ts               # job processing utilities
```

Rules:

- Domain services must be pure IO wrappers + business invariants.
- Authorization relies on RLS; services still validate required inputs.
- Keep APIs thin: BFF routes call domain services.

### Dedicated API service (optional)

Introduce `services/api` when you need:

- external integrations
- mobile API at scale
- long-running workflows
- advanced rate limiting

## Database Structure

```text
database/
  migrations/
    001_init.sql
    002_*.sql
  seeds/
    roles.sql                 # optional
  policies/
    rls-reference.md          # optional
```

Guidance:

- Schema changes must ship with:
  - migration
  - RLS update (if new tables)
  - changelog entry
  - updated docs (DATABASE/API if relevant)

## Realtime Structure

Start:

- Supabase Realtime listening to `match_events` INSERTs and `matches` updates

Scale-out:

- Add `services/realtime-gateway` when:
  - event volume is high
  - you want fine-grained fanout control and reliability

## AI Structure

Keep AI split between:

- Algorithmic utilities used in production (`ai/fixture-generator`)
- Pipelines and batch processing (`services/workers/ai-worker`, `ai/pipelines`)

```text
ai/
  fixture-generator/
    roundRobin.ts
  pipelines/
    features/
    training/
    inference/
```

## Module Boundaries (Domain Modules)

Use `modules/<domain>` as stable boundaries for types and service exports:

- types: `modules/<domain>/types.ts`
- service exports: `modules/<domain>/service.ts`

This allows apps to depend on `modules/*` instead of deep imports into `backend/services/*`.

See: [MODULES.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/MODULES.md)

## Deployment Units (Production)

- `apps/web` → edge-friendly web deployment
- `apps/eo-dashboard` → web deployment
- `apps/admin-dashboard` → web deployment
- `services/workers/*` → containers (scheduled + queue-driven)
- `database` → managed Postgres (Supabase)

