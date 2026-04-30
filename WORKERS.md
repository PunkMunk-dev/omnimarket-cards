# OmniMarket Cloud Worker Architecture

This document describes the background worker service that powers OmniMarket's
data pipelines, running separately from the Vercel-hosted frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Vercel (Frontend)                                               │
│  Vite + React SPA  →  Supabase Anon Key (read-only data)       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / Realtime
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Supabase                                                        │
│  PostgreSQL DB  ·  Edge Functions  ·  Storage  ·  Auth         │
└──────────────────────────────▲──────────────────────────────────┘
                               │ Service-Role Key (server only)
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│ Railway (Workers)                                               │
│                                                                 │
│  services/workers/                                              │
│  ├── worker.ts        — BullMQ consumer (processes all jobs)   │
│  ├── scheduler.ts     — Registers cron / repeatable jobs       │
│  ├── worker-once.ts   — One-shot manual job runner             │
│  └── jobs/            — Individual job handlers                │
│       ├── ebay-saved-search-refresh.ts                         │
│       ├── psa-spread-calculation.ts                            │
│       ├── odds-ingestion.ts                                     │
│       ├── ev-calculation.ts                                     │
│       ├── lead-scraping.ts                                      │
│       └── slack-alert-dispatch.ts                              │
│                                                                 │
│  Redis ←→ BullMQ Queue ("omnimarket-jobs")                      │
└─────────────────────────────────────────────────────────────────┘
```

## Package Structure

```
/
├── packages/
│   └── shared/          — Shared TypeScript types (jobs, eBay, PSA, odds, leads, Slack)
├── services/
│   └── workers/         — Node 20 BullMQ worker service
├── src/                 — Frontend SPA (Vite + React, Vercel)
├── supabase/            — SQL migrations + Edge Functions
├── .env.example         — All required environment variables
└── WORKERS.md           — This file
```

## Prerequisites

- Node 20+
- A running Redis instance (local, Upstash, or Railway Redis)
- A Supabase project (URL + service-role key)

## Local Development

### 1. Install dependencies

```bash
# From repo root
npm install

# Install worker dependencies
cd services/workers && npm install
cd ../../packages/shared && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL
```

### 3. Build the shared package

```bash
cd packages/shared && npm run build
```

### 4. Run the worker (development — hot reload)

```bash
cd services/workers
npm run dev:worker
```

### 5. Register scheduled jobs (run once, then let the worker process them)

```bash
cd services/workers
npm run worker:scheduler
```

### 6. Run a single job manually

```bash
cd services/workers
JOB=ebay-saved-search-refresh \
  JOB_PAYLOAD='{"savedSearchId":"abc","keywords":"charizard psa 10"}' \
  npm run worker:once
```

## Available Scripts (services/workers)

| Script | Description |
|--------|-------------|
| `npm run dev:worker` | Hot-reload worker (tsx watch) |
| `npm run worker:start` | Production worker (compiled JS) |
| `npm run worker:once` | Run a single job and exit |
| `npm run worker:scheduler` | Register cron schedules and exit |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm run build` | Compile TypeScript → dist/ |

## Scheduled Jobs (defaults)

| Job | Cron | Description |
|-----|------|-------------|
| `ebay-saved-search-refresh` | `*/15 * * * *` | Refresh eBay saved searches every 15 min |
| `odds-ingestion` (NFL) | `0 * * * *` | Ingest NFL odds every hour |
| `odds-ingestion` (NBA) | `5 * * * *` | Ingest NBA odds every hour at :05 |
| `lead-scraping` (Craigslist) | `0 */6 * * *` | Craigslist scrape every 6 h |
| `lead-scraping` (OfferUp) | `30 */6 * * *` | OfferUp scrape every 6 h at :30 |

## Retry / Dead-Letter Strategy

- **Attempts:** 3 per job (configurable via `defaultJobOptions` in `lib/queue.ts`)
- **Backoff:** Exponential, starting at 1 s
- **Dead letter:** Failed jobs after all retries are kept in the BullMQ failed set
  (last 1 000 entries) for manual inspection / replay
- **Unrecoverable errors:** Thrown as `UnrecoverableError` — skip retries immediately
  (e.g. unknown job names, config errors)
- **Stalled jobs:** BullMQ auto-detects and re-queues stalled jobs

## Deploying to Railway

### One-service deployment

1. Create a new Railway project.
2. Add a Redis plugin (or connect your own Redis URL as `REDIS_URL`).
3. Create a service pointing at `services/workers/`.
4. Set all environment variables from `.env.example` (backend section).
5. Railway auto-detects `railway.toml` and builds from the Dockerfile.

### Two-service deployment (recommended)

Deploy two Railway services from the same Dockerfile:

| Service | Start Command |
|---------|--------------|
| `worker` | `node dist/worker.js` |
| `scheduler` | `node dist/scheduler.js` |

Set `NODE_ENV=production` and all required env vars on both services.

## Deploying the Frontend to Vercel

The frontend is a standard Vite SPA. Vercel detects it automatically.

Required Vercel environment variables:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` is NEVER set on Vercel and is NEVER
> imported by any frontend code. It lives only in Railway worker environment.

## Adding a New Job

1. Add the payload type to `packages/shared/src/types/jobs.ts`.
2. Add the job name to the `JobName` union.
3. Create `services/workers/src/jobs/<your-job>.ts` exporting an async handler.
4. Import and add a case in `services/workers/src/worker.ts`.
5. (Optional) Register a cron in `services/workers/src/scheduler.ts`.
6. Re-run `npm run typecheck` and `npm run build` to verify.
