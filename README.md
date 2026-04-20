# Card Scout Live

A trading card market intelligence app for sports cards and TCG (Pokémon, One Piece, etc.).
Searches active eBay listings, surfaces PSA 10 sold comps, and estimates grading profit.

Built with **Vite + React 18 + TypeScript + Tailwind + shadcn/ui**, backed by **Supabase** (Postgres, Auth, Edge Functions) and the **eBay Browse API**.

---

## Prerequisites

- **Node.js 18+** (or **Bun 1.0+**)
- **npm**, **pnpm**, **bun**, or **yarn**
- A **Supabase project** (free tier works)
- An **eBay Developer account** with Production keys ([developer.ebay.com](https://developer.ebay.com))
- *(Optional)* **Supabase CLI** if you want to deploy edge functions locally: `npm i -g supabase`

---

## Quick start

```bash
# 1. Install dependencies
npm install
# or: bun install / pnpm install

# 2. Create your env file (see below)
cp .env.example .env
# then edit .env with your Supabase project values

# 3. Start the dev server
npm run dev
```

The app will be available at [http://localhost:8080](http://localhost:8080).

---

## Environment variables

Create a `.env` file in the project root with the following keys. **Only the `VITE_*` keys are needed for the frontend** — the rest are configured as secrets inside your Supabase project (see next section).

```env
# Frontend (Vite) — required
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...your-anon-key...
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

You can find these values in your Supabase dashboard under **Project Settings → API**.

> The `VITE_SUPABASE_PUBLISHABLE_KEY` is the public anon key — safe to ship in the bundle.
> Never commit a service-role key to the frontend.

---

## Supabase setup

### 1. Apply the database schema

Migrations live in `supabase/migrations/`. Apply them using either:

```bash
# Option A: Supabase CLI (recommended)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Option B: Manually run each .sql file in the Supabase SQL editor
```

### 2. Configure secrets for edge functions

The edge functions need access to the eBay API. Add these as secrets in your Supabase project (**Project Settings → Edge Functions → Secrets**):

| Secret name             | Description                                       | Where to get it                      |
| ----------------------- | ------------------------------------------------- | ------------------------------------ |
| `EBAY_CLIENT_ID`        | eBay Production App ID (Client ID)                | developer.ebay.com → My Account → Keysets |
| `EBAY_CLIENT_SECRET`    | eBay Production Cert ID (Client Secret)           | developer.ebay.com → My Account → Keysets |
| `LOVABLE_API_KEY`       | *(optional)* For AI gateway features              | Lovable AI dashboard                 |
| `RAPIDAPI_KEY`          | *(optional)* PSA population scraping              | rapidapi.com                         |
| `XIMILAR_API_TOKEN`     | *(optional)* Card image recognition               | ximilar.com                          |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` are injected automatically by Supabase — no need to set them manually.

### 3. Deploy edge functions

```bash
supabase functions deploy sports-ebay-search
supabase functions deploy sports-ebay-sold-psa
supabase functions deploy sports-ebay-psa10-active
supabase functions deploy sports-ebay-gem-rate
supabase functions deploy tcg-ebay-search
supabase functions deploy ebay-search
```

Or deploy all at once:

```bash
supabase functions deploy
```

---

## Available scripts

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server with HMR (port 8080)     |
| `npm run build`     | Production build to `dist/`                        |
| `npm run build:dev` | Development-mode build (unminified, source maps)   |
| `npm run preview`   | Preview the production build locally               |
| `npm run lint`      | Run ESLint across the codebase                     |
| `npm run test`      | Run the Vitest suite once                          |
| `npm run test:watch`| Run Vitest in watch mode                           |

---

## Project structure

```
src/
├── components/         # UI components (shadcn/ui + custom)
│   ├── sports-lab/     # Sports cards search & results
│   ├── tcg-lab/        # TCG (Pokémon, One Piece) search
│   └── ui/             # shadcn/ui primitives
├── pages/              # Route components (Index, SportsLab, TcgLab)
├── hooks/              # React hooks (useSportsEbaySearch, useTcgData, …)
├── contexts/           # React context providers (watchlists)
├── lib/                # Pure utilities (cleanTitle, ebay-api, etc.)
├── services/           # Service layer wrapping edge function calls
├── types/              # Shared TypeScript types
└── integrations/
    └── supabase/       # Auto-generated Supabase client + types

supabase/
├── functions/          # Deno edge functions (eBay search, PSA scraping)
├── migrations/         # SQL migrations (schema, RLS policies)
└── config.toml         # Supabase project config
```

---

## Tech stack

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind 3, shadcn/ui, React Router 6, TanStack Query
- **Backend**: Supabase (Postgres + RLS), Deno edge functions
- **APIs**: eBay Browse API (OAuth2), optional Ximilar / RapidAPI / Lovable AI
- **Testing**: Vitest + Testing Library

---

## Troubleshooting

**Edge functions return 500 with "EBAY_CLIENT_ID is not configured"**
→ Add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` as secrets in your Supabase project.

**Search returns 429 "rate limit exceeded"**
→ eBay throttles per app. Wait 60 seconds. If it persists, check your Production keyset isn't accidentally using Sandbox credentials.

**`Failed to fetch` from the frontend**
→ Verify `VITE_SUPABASE_URL` matches your project, and that the edge functions are deployed.

**Vite dev server won't start on port 8080**
→ Edit the `server.port` value in `vite.config.ts` or run `npm run dev -- --port 3000`.

---

## License

Private project. All rights reserved.
