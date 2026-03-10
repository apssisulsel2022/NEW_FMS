# ERD (PNG + SVG)

This repo stores migrations as the source of truth. ERD outputs (PNG/SVG) are generated from a running Postgres instance to guarantee they match the deployed schema.

## Outputs

- Target output directory: `docs/erd/out/`
  - `schema.svg` (diagram)
  - `schema.png` (diagram)

These are produced by the generation script. PNG is a binary artifact and is not stored in git by default.

## Generate ERD

Prerequisites:

- Docker (recommended)
- A Postgres connection string (`postgresql://...`) that has access to the schema

Run:

- Script: [render_erd.ps1](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/render_erd.ps1)

The script uses SchemaSpy in a container to introspect the database and produce a diagram export.

## Notes

- If you are using Supabase, run this against your local Supabase Postgres or a staging database.
- For the most accurate ERD, apply migrations first.

