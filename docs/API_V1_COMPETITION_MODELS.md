# API v1 – Competition Core Models

Base path: `/api/v1`

This specification defines CRUD endpoints for:

- Organizers
- Competition categories
- Seasons
- Competition formats

All endpoints:

- Require `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>` unless explicitly noted.
- Are tenant-scoped via `eventOrganizerId` for list/create operations.
- Use JSON for requests/responses and return the standard error format used by the API v1 layer.

## Organizers

### List organizers for current user

- `GET /event-organizers`

Response: array of organizers the user can access.

### Create organizer

- `POST /event-organizers`

Body:

- `name` (string, required)
- `slug` (string, required)
- `legalName` (string, optional)
- `website` (string, optional)
- `contactEmail` (string, optional)
- `contactPhone` (string, optional)
- `address` (string, optional)
- `country` (string, optional)

## Competition Categories

### List categories

- `GET /competition-categories?eventOrganizerId=UUID`

Filters:

- `discipline`, `categoryType`, `skillLevel`, `gender`
- `ageMin`, `ageMax`

### Create category

- `POST /competition-categories`

Body:

- `eventOrganizerId` (UUID, required)
- `name` (string, required)
- `slug` (string, required)
- `categoryType` (string, optional)
- `discipline` (string, optional)
- `ageGroupMin` (int, optional)
- `ageGroupMax` (int, optional)
- `skillLevel` (string, optional)
- `gender` (string, optional)
- `meta` (object, optional)

### Read/Update/Delete category

- `GET /competition-categories/:id`
- `PUT /competition-categories/:id`
- `PATCH /competition-categories/:id`
- `DELETE /competition-categories/:id`

## Seasons

### List seasons

- `GET /seasons?eventOrganizerId=UUID`

### Create season

- `POST /seasons`

Body:

- `eventOrganizerId` (UUID, required)
- `name` (string, required)
- `startsOn` (date, optional)
- `endsOn` (date, optional)
- `registrationOpensAt` (datetime, optional)
- `registrationClosesAt` (datetime, optional)
- `timezone` (string, optional)
- `schedulingConstraints` (object, optional)

### Read/Update/Delete season

- `GET /seasons/:id`
- `PUT /seasons/:id`
- `PATCH /seasons/:id`
- `DELETE /seasons/:id`

## Competition Formats

### List formats

- `GET /competition-formats?eventOrganizerId=UUID`

Notes:

- The response may include both tenant formats (`eventOrganizerId`) and global templates (`eventOrganizerId = null`) if allowed by RLS.

### Create format

- `POST /competition-formats`

Body:

- `eventOrganizerId` (UUID, required for tenant formats; omit for global templates)
- `code` (string, required)
- `name` (string, required)
- `formatType` (enum, required)
- `rules` (object, optional)

### Read/Update/Delete format

- `GET /competition-formats/:id`
- `PUT /competition-formats/:id`
- `PATCH /competition-formats/:id`
- `DELETE /competition-formats/:id`

### Format rules (key-based)

- `GET /competition-formats/:id/rules`
- `POST /competition-formats/:id/rules`
- `PATCH /competition-formats/:id/rules/:ruleId`
- `DELETE /competition-formats/:id/rules/:ruleId`

