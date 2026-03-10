# Development

## Install

Di root:

```bash
npm install
```

## Jalankan App

Di root:

```bash
npm run dev:web
npm run dev:admin
npm run dev:eo
```

Default port:

- `apps/web`: 3000
- `apps/admin-dashboard`: 3001
- `apps/eo-dashboard`: 3002

## Quality Gates

Di root:

```bash
npm run typecheck:web
npm run typecheck:admin
npm run typecheck:eo

npm run lint:web
npm run lint:admin
npm run lint:eo
```

## Env

Set env var per app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

