# Card Scout Live

A trading card market intelligence app for sports cards and TCG (Pokemon, One Piece, etc.).
Searches active eBay listings, surfaces PSA sold comps, and estimates grading profit.

Built with **Vite + React + TypeScript + Tailwind**, backed by **Supabase** and now a production-ready background processing layer using **Redis + BullMQ** workers.

---

## Architecture overview

This repository now uses a split architecture designed for production deployments:

- **Frontend**: Vercel-hosted Vite/React app (kept isolated from service-role secrets)
- **Primary backend**: Supabase (Postgres, Auth, Edge Functions)
- **Async workers**: `services/workers` Node 20 service (Railway/Fly compatible)
- **Queue layer**: Redis + BullMQ
- **Shared contracts**: `packages/shared` TypeScript job payload/result types
- **Automation layer**: Cursor Cloud Agents for engineering automation workflows

### Separation guarantees

- Frontend consumes only `VITE_*` env vars.
- `SUPABASE_SERVICE_ROLE_KEY` is used exclusively in `services/workers`.
- Workers are separate from Supabase Edge Functions and deploy independently.

---

## Prerequisites

- **Node.js 20+**
- **npm**
- **Redis** instance
- A **Supabase project**
- (optional) Railway or Fly account for worker hosting

---

## Environment variables

Copy and fill in the root env file:

```bash
cp .env.example .env
```

### Frontend env vars (Vercel-safe)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Worker-only env vars (never expose to client)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- Worker concurrency/retry/backoff/scheduler variables in `.env.example`

---

## Local development

```bash
npm install
```

### Run frontend

```bash
npm run dev
```

### Run worker service

```bash
npm run dev:worker
```

### Register scheduled jobs

```bash
npm run worker:scheduler
```

### Enqueue a single sample job

```bash
npm run worker:once
# or choose queue
npm run worker:once -- odds-ingestion
```

---

## Worker package details

Worker service lives in:

```text
services/workers/
```

Key components:

- `src/config/env.ts` - zod env validation
- `src/lib/logger.ts` - structured pino logging
- `src/lib/redis.ts` - Redis connection helpers
- `src/lib/supabase.ts` - service-role Supabase client helper
- `src/queues/*` - BullMQ queue setup/options/registry
- `src/jobs/*` - job routing + handlers + dead-letter publishing
- `src/scheduler/*` - recurring schedule definitions and registration
- `src/entrypoints/worker.ts` - worker runtime
- `src/entrypoints/scheduler.ts` - schedule registration entrypoint
- `src/entrypoints/worker-once.ts` - single-run enqueue helper

### Included example jobs

- ebay saved-search refresh
- PSA spread calculation
- odds ingestion
- EV calculation
- lead scraping
- Slack alert dispatch

### Reliability patterns implemented

- Retry with exponential backoff
- Dead-letter queue for exhausted retries
- Graceful shutdown with timeout
- Structured logs with queue/job context

---

## Deployment

### Frontend (Vercel)

Deploy the existing frontend as-is on Vercel using your current project setup.

### Workers (Railway)

Worker deployment files are in `services/workers/`:

- `railway.json`
- `Procfile`

Recommended start command:

```bash
npm run worker:start
```

To run scheduler as a separate process/service:

```bash
npm run worker:scheduler
```

### Workers (Fly)

`services/workers/fly.toml` and `services/workers/Dockerfile` are included as a Fly-compatible baseline.

---

## Scripts

### Root scripts

- `npm run dev` - frontend dev server
- `npm run build` - frontend + shared + worker build
- `npm run typecheck` - frontend + shared + worker typecheck
- `npm run dev:worker`
- `npm run worker:start`
- `npm run worker:once`
- `npm run worker:scheduler`

---

## Project structure

```text
src/                        # Vite frontend
supabase/                   # Supabase migrations + edge functions
packages/shared/            # Shared TypeScript job contracts
services/workers/           # Node 20 worker service
```

---

## License

Private project. All rights reserved.
