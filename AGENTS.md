# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Card Scout Live is a React SPA (Vite + TypeScript + Tailwind + shadcn/ui) backed by a hosted Supabase project (PostgreSQL + Deno Edge Functions). There is no local backend to run — all backend logic runs on Supabase's hosted infrastructure.

### Available commands

See `package.json` scripts. Key commands:

- `npm run dev` — Vite dev server on port 8080
- `npm run build` — production build to `dist/`
- `npm run lint` — ESLint (flat config, ESLint 9)
- `npm run test` — Vitest (jsdom, 2 test files)

### Environment variables

The frontend needs two `VITE_*` env vars in `.env` (see `.env.example`):

- `VITE_SUPABASE_URL` — `https://paknqtrhsmyrhasujbsi.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — public anon key from Supabase Dashboard (must be provided as a secret `VITE_SUPABASE_ANON_KEY`)

Without a valid anon key, the app renders correctly but API calls to Supabase will fail gracefully ("Market data temporarily unavailable").

### Gotchas

- Node.js is **not** pre-installed in the base VM image — the update script installs it via `apt-get install nodejs npm`. This gives Node 18.x from Ubuntu 24.04 repos, which satisfies the project requirement of Node 18+.
- The npm version from Ubuntu repos (9.2.0) is older but compatible with the lockfile.
- `npm run lint` reports ~31 pre-existing errors (mostly `@typescript-eslint/no-explicit-any`). These are in the existing codebase and do not indicate a broken setup.
- The Vite dev server binds to `::` (all interfaces) on port 8080 with HMR overlay disabled.
- Supabase Edge Functions (in `supabase/functions/`) are Deno-based and deployed to the hosted Supabase project — they do not run locally during frontend development.
