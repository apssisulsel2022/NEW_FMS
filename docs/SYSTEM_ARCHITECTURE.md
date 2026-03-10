# National Football Competition Platform — System Architecture

This document describes a production-grade architecture for a national football competition platform, covering frontend, backend, database, realtime, and AI services. It aligns with the current repo layout (`apps/*`, `backend/services/*`, `database/migrations/*`, `ai/*`) while leaving room for scale.

## Goals

- Multi-tenant SaaS: each Event Organizer (EO) is a tenant.
- Public experience: fast, SEO-friendly tournament pages, fixtures, standings, results, and live updates.
- Operational dashboards: EO dashboard for managing competitions; admin dashboard for platform operations.
- Realtime: live match events, scores, and standings updates.
- Extensible AI: automation and intelligence for scheduling, highlights, anomaly detection, and player verification.
- Security: strong tenant isolation, least privilege, auditable operations.

## High-Level Components

- Web apps (Next.js)
  - Public site: `apps/web` (read-only for anon)
  - EO dashboard: `apps/eo-dashboard` (authenticated)
  - Admin dashboard: `apps/admin-dashboard` (privileged)
- API layer
  - Next.js Route Handlers for BFF-style endpoints (currently in `apps/eo-dashboard/src/app/api/*`)
  - Optional dedicated API service for heavy workloads (recommended at scale)
- Data layer
  - Postgres (Supabase) with RLS for tenant isolation
  - Object storage for media (logos, photos, videos)
  - Cache (Redis) for hot reads and rate limiting at scale
- Realtime
  - Postgres changes stream (Supabase Realtime) for live match events and scoreboards
  - Optional event bus (Kafka/NATS) for high-volume national competitions
- Background processing
  - Job queue + workers for automation: fixture generation, standings recompute, media pipeline
- AI services
  - Feature engineering + model services + batch pipelines (highlights, fraud/anomaly, forecasting)

## Deployment Topology (Recommended)

- Edge/CDN
  - Cache public pages and API responses where safe
  - Serve images/media via CDN
- Frontends
  - Deploy each app independently (Vercel/Netlify/container)
  - Separate domains/subdomains:
    - `www.example.com` → public site
    - `eo.example.com` → EO dashboard
    - `admin.example.com` → admin dashboard
- Backend
  - Start with Next.js Route Handlers as BFF
  - Add a dedicated API service when:
    - complex authorization logic beyond RLS
    - high throughput (mobile apps + integrations)
    - long-running requests
- Workers
  - Containerized worker(s) consuming `automation_jobs` / queue
  - Scheduled tasks (cron) for periodic jobs
- Database
  - Postgres primary + read replicas (when needed)
  - PITR backups, migration pipeline

## Multi-Tenancy & Authorization

### Tenant model

- Tenant = Event Organizer
- Most domain tables contain `event_organizer_id`
- Membership table controls access: `event_organizer_members`

### Enforcement strategy

- Primary authorization: Postgres RLS
  - Authenticated users can access tenant rows only if they are members of the tenant.
  - Anonymous users can access only published data (public read policies).
- Secondary authorization (app-side)
  - API routes must validate required parameters and pass the user’s access token to Supabase
  - Optional role checks for privileged actions (admin-only)

### Tenant routing & UX

- EO dashboard is tenant-aware:
  - User can be a member of multiple event organizers
  - UI must always operate under a selected active `event_organizer_id`
  - Store active tenant locally and allow switching at any time
- Recommended capability:
  - An endpoint that lists tenants the current user belongs to (no client-provided user_id), driven by RLS on `event_organizer_members`

### Data isolation guarantees

- All writes must include the correct `event_organizer_id` and will be rejected by RLS if the user is not a member.
- Cross-tenant data leakage prevention relies on:
  - RLS policies on all tenant tables
  - No service-level “admin key” usage in app code paths
  - Strict separation for platform admin operations (super-admin only)

### Roles

- Platform: `super_admin`
- Tenant: `event_organizer`
- Operational: `team_manager`, `referee`
- Public: `public_viewer` (implicit for anon browsing)

## Core Domain Data Model (Conceptual)

- Competition
  - categories, season, publish status, lifecycle
- Teams & Players
  - roster management, eligibility, verification
- Matches
  - fixtures, status, venue, scoreboard
- Match events
  - timeline events (goal, card, substitution, VAR, etc.)
- Standings & statistics
  - derived tables updated from match state/events
- Media
  - uploads, generated highlights, thumbnails
- Automation
  - job queue for deterministic processing

Database implementation is in [001_init.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/database/migrations/001_init.sql).

## Public Website Architecture

### Rendering strategy

- Default: Server Components + cached fetch with revalidation where possible
- Live pages: disable caching on live match pages or use short revalidation

### Data access

- Use a public Supabase client (anon key) for published data only
- RLS ensures anonymous users can only read `published_at is not null` data

### URLs

- `/:competitionSlug` or `/competition/:slug`
- Optional: `/match/:matchId` for live match view

## EO Dashboard Architecture

### Authentication

- Supabase Auth (email/password, SSO optional later)
- Client obtains access token
- API routes accept `Authorization: Bearer <token>` and create Supabase client with that token

### BFF API routes

- CRUD endpoints for competitions, teams, matches, events
- Keep business logic in `backend/services/*`

### Tenant context

- EO selection UI should store active tenant id and fetch only tenant data
- Recommended: avoid manual ID entry by listing member tenants from DB

## Backend & API Architecture

### Current pattern (repo-aligned)

- Domain services: `backend/services/*`
- BFF routes: `apps/*/src/app/api/*`
- AuthZ: enforced by RLS; app validates input and passes user token

### Recommended expansion

- Dedicated API service (optional)
  - REST or GraphQL
  - Internal service-to-service auth
  - Outbound integrations (payments, federation systems, broadcasting)

## Realtime Architecture

### Realtime data sources

- `match_events` as the append-only stream of truth for live match actions
- `matches` holds the current scoreboard state (home_score/away_score, status)
- `standings` derived table updated by workers/triggers

### Delivery

- Supabase Realtime subscriptions to Postgres changes for:
  - INSERT into `match_events`
  - UPDATE to `matches` for scoreboard changes
- Client subscribes by match ID

### Scaling path

- If national scale produces very high event throughput:
  - Introduce an event bus (Kafka/NATS)
  - Write events to the bus and persist to Postgres asynchronously
  - Push to clients via WebSocket gateway

## Background Jobs & Automation

### Why jobs

- Keep user-facing requests fast
- Ensure deterministic processing and retry semantics

### Job types

- Fixture generation
- Standings initialization/recompute
- Media generation (thumbnails, highlights)
- Notifications (push/email)
- Integrity checks (anti-fraud)

### Execution model

- Database trigger enqueues jobs on publish
- Worker polls queue or consumes a queue system
- Worker writes results back to DB (still under tenant constraints where applicable)

## AI Services Architecture

AI is treated as a set of services/pipelines, not a single feature.

### AI use cases

- Fixture optimization (constraints: travel, rest days, venue availability)
- Highlight generation (detect key moments from event stream + video)
- Anomaly detection (suspicious scores/events patterns, officiating anomalies)
- Player verification (face verification flow, liveness)
- Forecasting (win probability, ranking projections)

### Data flow

- Online features:
  - Consume match event stream (near realtime)
  - Store features in a feature store (optional) or dedicated tables
- Offline training:
  - Periodic extraction from Postgres to a data lake (S3/GCS)
  - Train models and publish artifacts

### Serving patterns

- Low-latency inference: model service (HTTP/gRPC) + cache
- Batch inference: workers scheduled via cron/queue

## Observability & Operations

- Structured logs (request id, tenant id, user id)
- Metrics (latency, error rate, realtime disconnect rate)
- Tracing across BFF routes and workers
- Audit logs for privileged actions (publish, score edits, role changes)

## Security & Compliance

- Tenant isolation via RLS as primary guardrail
- Separate admin domain and strict role checks
- Secrets managed in deployment environment (never in repo)
- Rate limiting for auth + public endpoints
- Media uploads with signed URLs, virus scanning for uploads at scale
- Backup/restore and incident response runbooks

## Suggested Evolution Roadmap

- Phase 1: current foundation (RLS + BFF routes + basic realtime)
- Phase 2: standings recompute worker, tenant selection UX, public match live page
- Phase 3: dedicated worker queue, cache layer, admin observability
- Phase 4: AI pipelines + feature store + moderation and anti-fraud

