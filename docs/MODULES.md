# Platform Modules (Scalable Boundaries)

This document breaks the platform into scalable modules and defines boundaries for data ownership, APIs, events, and scaling paths. It is intended to guide incremental implementation without coupling everything into a single service.

The current repository already contains initial modules:

- `modules/competitions`
- `modules/teams`
- `modules/matches`

This document expands the modular map to include players, statistics, referees, media, and AI services.

## Boundary Rules

- Each module owns a clear set of tables (or table namespace) and is the only module that performs writes to those tables.
- Cross-module reads are allowed but must not assume internal invariants unless exposed through a module API.
- Derived data (standings/statistics) should be written by the owning module via jobs/workers, not ad-hoc from UI.
- Realtime streams come from append-only event tables (e.g., `match_events`) and feed projection modules (statistics, media, AI).

## Competition Module

**Responsibilities**

- Competition lifecycle: draft → published → archived
- Categories, season metadata, publish gate for public visibility
- Trigger automation jobs on publish

**Data ownership (tables)**

- `competitions`
- `competition_categories`
- `automation_jobs` (ownership can be a separate Automation module; see below)

**Module API (service layer)**

- `createCompetition()`, `listCompetitions()`, `publishCompetition()`

**Events**

- Produced:
  - `competition.published` (implemented as DB trigger enqueue jobs)
- Consumed:
  - None (core source of truth)

**Scaling notes**

- Publishing should be idempotent; repeated publish should not enqueue duplicate jobs.
- Public reads should be cacheable and filtered by `published_at`.

## Teams Module

**Responsibilities**

- Team CRUD within a competition
- Team branding metadata (logo, colors)

**Data ownership**

- `teams`
- Optional future: `team_branding`, `team_contacts`

**Module API**

- `createTeam()`, `listTeams()`

**Events**

- Produced:
  - `team.created`
- Consumed:
  - `competition.published` indirectly to validate publish prerequisites (optional)

**Scaling notes**

- Team slugs should be unique per competition.

## Players Module

**Responsibilities**

- Player identity (within tenant), eligibility, verification workflows
- Rosters: mapping players to teams and seasons

**Data ownership**

- `players`
- `team_players`
- `player_verifications`
- `face_recognition_logs`

**Module API (recommended)**

- `createPlayer()`, `updatePlayer()`, `listPlayers()`
- `assignPlayerToTeam()`, `removePlayerFromTeam()`, `listTeamPlayers()`
- `requestVerification()`, `recordVerificationResult()`

**Events**

- Produced:
  - `player.created`, `player.verified`, `roster.updated`
- Consumed:
  - `media.face_embedding.created` (optional, AI/Media integration)

**Scaling notes**

- Treat verification as an auditable process; keep immutable logs.

## Matches Module

**Responsibilities**

- Fixture management, scheduling, match lifecycle
- Authoritative match state (score, status)
- Match event stream (timeline)

**Data ownership**

- `matches`
- `match_events`
- `lineups`

**Module API**

- `createMatch()`, `listMatches()`, `updateScore()`, `createMatchEvent()`

**Events**

- Produced:
  - `match.created`, `match.started`, `match.finished`
  - `match_event.created` (append-only)
- Consumed:
  - `competition.published` (fixtures generation job)

**Scaling notes**

- Make `match_events` the canonical stream; keep it append-only.
- Keep `matches.home_score/away_score` as a projection for fast reads.

## Statistics Module

**Responsibilities**

- Derived data: standings, player stats, competition aggregates
- Computation pipelines driven by match state/events

**Data ownership**

- `standings`
- `player_statistics`
- `competition_statistics`

**Module API (recommended)**

- `initializeStandings(competitionId)`
- `recomputeStandingsFromMatches(competitionId)`
- `applyMatchEventToStats(matchEventId)` (stream projection)
- `getStandings(competitionId)`

**Events**

- Produced:
  - `standings.updated`, `stats.updated`
- Consumed:
  - `match_event.created`
  - `match.finished`

**Scaling notes**

- Prefer incremental updates (apply events) over full recompute, but keep a full recompute job for repair.
- Keep deterministic logic; version projection logic if rules change.

## Referees Module

**Responsibilities**

- Referee registry and assignments to matches
- Availability and conflict constraints
- Audit trails for assignments and changes

**Data ownership (recommended future tables)**

- `referees`
- `referee_assignments`
- `referee_availability`

**Module API (recommended)**

- `createReferee()`, `listReferees()`
- `assignRefereeToMatch(matchId, refereeId, role)`
- `listMatchOfficials(matchId)`

**Events**

- Produced:
  - `referee.assigned`
- Consumed:
  - `match.created`, `match.rescheduled`

**Scaling notes**

- Treat assignments as critical operations with strong audit logging.

## Media Module

**Responsibilities**

- Media uploads, processing, and generated assets (thumbnails, posters, highlight clips)
- Secure access patterns (signed URLs), moderation workflows

**Data ownership**

- `generated_media`
- Optional future: `media_uploads`, `media_processing_jobs`

**Module API (recommended)**

- `createUploadSession()`, `completeUpload()`
- `generateHighlight(matchId)` (usually async)
- `listMediaForCompetition(competitionId)`

**Events**

- Produced:
  - `media.uploaded`, `media.generated`
- Consumed:
  - `match_event.created` (trigger highlight candidate)
  - `match.finished` (generate summary/highlights)

**Scaling notes**

- Processing should be asynchronous; never block match operations.

## AI Services Module

**Responsibilities**

- Inference and training pipelines
- Feature extraction from match streams and media
- Fraud/anomaly detection, forecasting, optimization

**Data ownership**

- `automation_jobs` (if treated as a platform job bus)
- Optional future: `ai_models`, `ai_inference_logs`, `feature_store_*`

**Module API (recommended)**

- `enqueueFixtureOptimization(competitionId)`
- `enqueueHighlightDetection(matchId)`
- `scoreAnomalyRisk(matchId)`
- `forecastStandings(competitionId)`

**Events**

- Produced:
  - `ai.inference.completed`, `ai.anomaly.detected`
- Consumed:
  - `competition.published`, `match_event.created`, `match.finished`

**Scaling notes**

- Separate online inference from offline training.
- Log inference inputs/outputs for auditability and model improvement.

## Automation Module (Platform Utility)

Even if not requested explicitly, automation is the glue that keeps modules decoupled.

**Responsibilities**

- Queueing, claiming, retries, idempotency
- Running deterministic jobs for projections and side effects

**Data ownership**

- `automation_jobs`

**API**

- `claimNextJob()`, `completeJob()`, `processJob()`

