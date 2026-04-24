# OmniMarket Cards — System Handoff (TCG Intelligence Platform)

**Last updated:** April 24, 2026  
**Repo:** `https://github.com/PunkMunk-dev/omnimarket-cards`  
**Branch:** `main`  
**Vercel project:** `omnimarket-cards` (`prj_0kWpG8ibVWD6MH9ex18ltSbaxe1c`)  
**Supabase project ref:** `paknqtrhsmyrhasujbsi`

---

## 1. Executive Summary

OmniMarket Cards is a TCG investment intelligence platform. Its core value proposition is showing collectors and investors **exactly which Pokémon and One Piece cards are underpriced relative to their PSA 10 graded value** — in real time, without requiring any domain expertise.

The interface surfaces:
- Live eBay raw listings for a searched card
- PriceCharting raw market price + PSA 10 **estimate** looked up automatically per listing
- Computed profit spread ("Spread Est.") and ROI after a $25 grading cost assumption
- Confidence labels reflecting data quality (shown as "approx." for medium/low matches)
- GemRate population count (total grades) + match confidence from `tcg-gemrate-search` edge function
- Hot badges for cards showing specific opportunity signals

**Current state (working in production):**
- Full eBay search pipeline (guided + free-text) via Supabase Edge Function → eBay Browse API
- PriceCharting price lookup via second edge function, 24-hour caching, per-card lazy loading
- ROI discovery feed (Top 100) ranked by blended opportunity score from `pricecharting_tcg_cards` table (85,000+ rows)
- Hot cards feed derived from the same dataset
- Sports tab exists (beta) but is a separate, lower-priority system

**TCG is the primary focus.** Sports features are preserved but marked beta.

---

## 2. System Architecture

```
User Browser (Vite + React SPA)
    │
    ├── Direct reads → Supabase PostgREST (anon key)
    │       └── pricecharting_tcg_cards  (read-only, public)
    │       └── tcg_entities             (read-only, public)
    │
    ├── supabase.functions.invoke() → Supabase Edge Functions (Deno)
    │       ├── tcg-ebay-search          (eBay Browse API + Finding API)
    │       ├── pricecharting-tcg-lookup (reads DB with service role, writes cache)
    │       └── tcg-gemrate-search       (GemRate population lookup per card)
    │
    └── Vercel CDN (static SPA delivery + Supabase env vars)
```

### Frontend
- **Stack:** Vite 5, React 18, React Router v6, TypeScript
- **NOT Next.js.** This is a pure SPA. No SSR, no server components, no `"use client"` directives.
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives) + custom CSS variables (`--om-bg-*`, `--om-text-*`, `--om-accent`, etc.)
- **State:** React Query (`@tanstack/react-query`) for all server state. No Redux or Zustand.
- **Theme:** `next-themes` library for dark/light toggle, defaulting dark.
- **Routes:** `/` (search landing), `/tcg` (TCG lab), `/sports` (sports lab — beta)
- **Lazy loading:** `TcgLab`, `SportsLab`, `NotFound` are all `React.lazy()` with `Suspense`

### Backend (Supabase)
- **Database:** PostgreSQL on Supabase (`paknqtrhsmyrhasujbsi`)
- **Auth:** None. All reads are anonymous (anon key). No user accounts currently.
- **Edge Functions:** Deployed to Supabase, written in Deno/TypeScript.
- **Service role key:** Used only inside edge functions on the server. Never sent to the browser.

### Separation of access levels
| Layer | Key used | Where |
|-------|----------|-------|
| Browser → PostgREST | `VITE_SUPABASE_ANON_KEY` | `src/integrations/supabase/client.ts` |
| Browser → Edge functions via `supabase.functions.invoke()` | Anon JWT (auto-sent by supabase-js) | Same client |
| Edge function → PostgREST | `SUPABASE_SERVICE_ROLE_KEY` | Inside Deno env, bypasses RLS |
| Edge function → external APIs (eBay) | `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` | Deno env |

---

## 3. Database Schema (Supabase)

### `pricecharting_tcg_cards`

**Purpose:** Primary pricing data source. Stores raw + graded market prices for ~85,000 TCG cards sourced from PriceCharting.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `int4` | PK |
| `product_name` | `text` | Display name as sourced |
| `normalized_name` | `text` | Lowercased, stripped name used for matching |
| `category` | `text` | `'pokemon'` or `'onepiece'` |
| `console_name` | `text` | Set name (e.g. `"Scarlet & Violet"`) |
| `loose_price` | `float8` | Raw (ungraded) market price in USD |
| `graded_price` | `float8` | PSA 10 market price in USD |

**How it's used:**
- `useTopRoi` hook queries this table directly via PostgREST (anon key), filters client-side by price floors, computes opportunity scores, returns top 150.
- `pricecharting-tcg-lookup` edge function queries this table using service role for card lookups triggered by eBay listing titles.
- `usePricechartingCards` queries this for entity search results within `useTcgData`.

**Index status:** Relies on `ilike` on `normalized_name`. A `pg_trgm` index on `normalized_name` would materially improve edge function lookup speed (see §12).

---

### `pricecharting_cache`

**Purpose:** 24-hour result cache for the `pricecharting-tcg-lookup` edge function. Prevents redundant external lookups for the same card title.

| Column | Type | Notes |
|--------|------|-------|
| `normalized_query` | `text` | Cache key (normalized title, prefixed `csv:`) |
| `result` | `jsonb` | Full response JSON |
| `cached_at` | `timestamptz` | Written at lookup time |

**How it's used:** On every `pricecharting-tcg-lookup` call, the edge function checks this table first. On miss, it queries `pricecharting_tcg_cards`, scores the match, writes result here, and returns it. TTL = 24 hours, enforced in application code.

---

### `tcg_entities`

**Purpose:** Curated list of searchable entities (characters/cards) shown in the guided search entity dropdown. 20 rows currently.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | Display name (e.g. `"Charizard"`) |
| `slug` | `text` | URL-friendly identifier |
| `category` | `text` | `'pokemon'` or `'one_piece'` |
| `sort_order` | `int4` | Controls dropdown ordering |

**How it's used:** `useTcgEntities()` hook reads this for the entity dropdown in `TcgHeader`. Selecting an entity triggers an eBay search for that character combined with optional set + trait refinements.

---

### Other tables (TCG supporting)

| Table | Purpose |
|-------|---------|
| `tcg_targets` | Legacy target system (character + priority). Used by `useTargets()` hook. Being superseded by `tcg_entities`. |
| `tcg_traits` | Card trait descriptors (e.g. "Alt Art", "1st Edition") used in guided search query construction |
| `tcg_sets` | Set names per game, weighted by recency/importance, used in set filter dropdown |

---

## 4. RLS & Security Model

**All TCG read tables are public (anon readable).** There are no user accounts, no per-user data, and no write paths from the browser.

| Table | RLS | Browser Access | Notes |
|-------|-----|----------------|-------|
| `pricecharting_tcg_cards` | Effectively public | Anon read | No PII, read-only |
| `pricecharting_cache` | Service role only | None | Written by edge function only |
| `tcg_entities` | Effectively public | Anon read | Read-only |
| `tcg_targets` | Effectively public | Anon read | Read-only |
| `tcg_traits` | Effectively public | Anon read | Read-only |
| `tcg_sets` | Effectively public | Anon read | Read-only |

**Service role usage:** The `SUPABASE_SERVICE_ROLE_KEY` is loaded exclusively via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` inside the `pricecharting-tcg-lookup` edge function. It is never exposed to the browser and not present in any frontend env var.

**Edge function JWT:** When using `supabase.functions.invoke()` from the browser, the supabase-js client automatically includes the anon key as a Bearer token. Edge functions receive and can inspect this JWT. Direct `fetch()` to edge function URLs (as done in `useSportsGemRate.ts`) requires manually adding `Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}`.

**No auth system.** If per-user watchlists or access controls are added in future, RLS policies will need to be written against a `user_id` column and Supabase Auth JWTs.

---

## 5. Search System

### Guided Search (entity-based)

The primary search mode on `/tcg`. Flow:

1. User selects game (Pokémon or One Piece)
2. User selects an entity from the entity dropdown (e.g. "Charizard") — sourced from `tcg_entities`
3. Optionally selects a set from `tcg_sets` and a trait from `tcg_traits`
4. `TcgHeader` assembles a query string: `"{entity} {set_name} {trait_search_terms}"`
5. Query is passed to `TerminalView` → `searchActiveListings()` → `tcg-ebay-search` edge function
6. Results filtered + deduped client-side, rendered as `TerminalCard` grid

### Free Search (quick mode)

Secondary mode. User types a raw query string in `TcgHeader`. The query goes directly to `tcg-ebay-search`. No entity normalization. Good for specific card lookups (e.g. `"Charizard 025/198 PSA 10"`).

### eBay search pipeline

`tcgEbayService.ts` → `supabase.functions.invoke('tcg-ebay-search')` → eBay Browse API v1

The edge function:
- Acquires an eBay OAuth token (client credentials, cached in Deno module scope until expiry)
- Strips decorative terms (alt art, full art, etc.) from the query before sending to eBay, then re-boosts matching results to the top client-side
- Appends exclusion terms to the eBay query string (junk lots, sealed, graded)
- Uses eBay category `183454` (Trading Card Games — Individual Cards)
- Returns `{ items, total, hasMore, offset }`

Client-side post-processing in `tcgFilters.ts`:
- Hard-exclude blocklist re-check (defense in depth vs edge function)
- Damaged/HP card filter
- Graded/raw card type filter
- Image quality scoring (thumbnail size heuristic)
- Language detection (English/Japanese)
- Deduplication by normalized title + card number + language

### PriceCharting lookup (per listing)

After eBay results render, each `TerminalCard` mounts an `IntersectionObserver` (via `usePricechartingLookup`). When a card scrolls into view, it fires `supabase.functions.invoke('pricecharting-tcg-lookup')` with the eBay listing title.

The edge function:
1. Normalizes the title (strips grader marks, noise words)
2. Extracts card number if present (e.g. `025/198`, `OP13-118`)
3. Checks `pricecharting_cache` — returns immediately on hit
4. Queries `pricecharting_tcg_cards` by card number or main name token
5. Scores candidates by token overlap and card number match
6. Returns matched card's `loose_price`, `graded_price`, computed `estimatedProfit`, `roiPercent`, and a `matchConfidence` of `high | medium | low`
7. Writes result to `pricecharting_cache`

Low-confidence matches are **shown** with an "approx." marker — they are no longer suppressed. Only a complete `no_match` from the edge function results in "No PSA 10 data".

A session-level `Map<string, PricechartingResult | null>` in `usePricechartingLookup` deduplicates within a browser session so the same card title never makes two requests.

### Current limitations

- **No text-search index on `normalized_name`.** ILIKE queries are full scans. Acceptable at 85k rows; will need `pg_trgm` at 500k+.
- **Entity coverage is thin.** 20 entities covers the major characters but misses niche pulls. No user-controlled search within entities.
- **Matching is heuristic.** An eBay title of `"Charizard ex Obsidian Flames 125/197"` maps to PriceCharting by token overlap. Mismatches happen on unusual card formats.
- **Sold comps** (eBay Finding API) exist but are only used in Sports. TCG shows a link to eBay sold search, not an in-app comp view.

---

## 6. ROI + Scoring Engine

All scoring logic is centralized in `src/lib/tcgScoring.ts`. No scoring heuristics exist in components.

### Data flow

```
pricecharting_tcg_cards (85k rows)
  → PostgREST query (loose_price ≥ 15, graded_price ≥ 50, order by graded_price desc, limit 600)
  → passesPriceFilter() + passesNameFilter()   ← pre-filter
  → computeConfidence()                         ← price quality signal
  → computeOpportunityScore()                   ← blended rank score
  → getHotnessLabel()                           ← optional hot badge signal
  → sort by opportunityScore desc, slice to 150
```

### Pre-filters

Cards failing any of these are dropped before scoring:

```
raw_price   ≥ $15
graded_price ≥ $50
graded_price > raw_price
spread (graded - raw) ≥ $15
name passes junk filter (23 terms)
```

**Junk filter terms:**
`lot`, `repack`, `pack`, `booster`, `box`, `bundle`, `sealed`, `display`, `tin`, `code card`, `collection`, `binder`, `storage`, `sleeve`, `protector`, `coin`, `token`, `energy card`, `trainer card`, `figure`, `plush`, `mug`, `shirt`, `poster`, `art book`

### Confidence Score

Measures **data quality** — not card desirability. Three components summing to 100:

```typescript
function computeConfidence(raw: number, graded: number): { score: number; label: ConfidenceLabel } {
  const score =
    priceQualityPts(raw)          // 0–40: rewards higher raw prices
    + gradedQualityPts(graded)    // 0–30: rewards higher graded prices
    + multiplierSanityPts(raw, graded); // 0–30: penalizes >15x graded/raw ratio

  const label =
    score >= 70 ? 'High' :
    score >= 45 ? 'Medium' : 'Low';
  return { score, label };
}
```

**Price quality (0–40):**

| Raw price | Points |
|-----------|--------|
| ≥ $100    | 40 |
| ≥ $50     | 32 |
| ≥ $25     | 22 |
| ≥ $15     | 12 |

**Graded quality (0–30):**

| Graded price | Points |
|-------------|--------|
| ≥ $500      | 30 |
| ≥ $200      | 22 |
| ≥ $100      | 15 |
| ≥ $50       | 8 |

**Multiplier sanity (0–30):** `mult = graded / raw`

| Ratio | Points |
|-------|--------|
| ≤ 4×  | 30 |
| ≤ 8×  | 20 |
| ≤ 15× | 10 |
| > 15× | 0  |

### Opportunity Score

Final blended rank (0–100). This is the sort key for the Top ROI feed.

```typescript
function computeOpportunityScore(raw, graded, name, confidenceScore): number {
  const profit  = graded - raw;
  const roi     = (profit / raw) * 100;

  return (
    roiPts(roi)                          // 0–40: log-scaled ROI
    + spreadPts(profit)                  // 0–30: dollar spread
    + (confidenceScore / 100) * 20       // 0–20: confidence contribution
    + chaseBoost(name)                   // 0–10: keyword boost
  );
}
```

**ROI component — log-scaled:**
```typescript
// Denominator = log1p(3) means 300% ROI saturates the component.
// Prevents sub-$20 cards with 800% ROI from dominating.
roiPts(roi) = min(ln(1 + roi/100) / ln(4), 1.0) * 40
```

Sample outputs:

| ROI | Points |
|-----|--------|
| 500% | 40 |
| 300% | 40 |
| 200% | ~31.7 |
| 100% | ~20 |
| 50%  | ~11.7 |

**Spread component:**
```
spreadPts(profit) = min(profit, $500) / $500 * 30
```

**Chase keyword boost (one-time, highest tier wins):**

| Keywords | Points |
|----------|--------|
| vmax, vstar, alt art, alternate art | 10 |
| full art, rainbow, illustration rare, special art | 8 |
| secret rare, hyper rare, gold star, 1st edition | 6 |

### Full pseudocode

```typescript
// src/lib/tcgScoring.ts

function scoreTcgOpportunity(raw: number, graded: number, name: string) {
  // Step 1: Pre-filter
  if (!passesPriceFilter(raw, graded)) return null;
  if (!passesNameFilter(name)) return null;

  // Step 2: Derived values
  const profit = graded - raw;
  const roi    = (profit / raw) * 100;

  // Step 3: Confidence
  const { score: confidence, label: confidenceLabel } = computeConfidence(raw, graded);

  // Step 4: Opportunity score
  const opportunityScore = computeOpportunityScore(raw, graded, name, confidence);

  // Step 5: Hotness label (optional, null if Low confidence)
  const hotnessLabel = getHotnessLabel(name, profit, roi, raw, confidenceLabel);

  return { profit, roi, confidence, confidenceLabel, opportunityScore, hotnessLabel };
}
```

---

## 7. Confidence System

The **confidence label** (High / Medium / Low) represents the **quality and trustworthiness of the price data**, not the card's market momentum or desirability.

A High Confidence card means:
- The raw price is meaningful (≥ $25, preferably ≥ $50)
- The graded price is substantial (≥ $100, preferably ≥ $200)
- The graded/raw ratio is realistic (≤ 4–8×)

A Low Confidence card means one or more of:
- Raw price is near the floor ($15–$20) — limited data, high spread variability
- Graded price is low ($50–$100) — small absolute opportunity even at high ROI%
- Graded/raw ratio exceeds 15× — likely a data error or extreme edge case

**Confidence affects the system in two ways:**

1. **Opportunity score:** `(confidence / 100) * 20` contributes up to 20 points. Low confidence cards rank lower.
2. **Hotness label suppression:** `getHotnessLabel()` returns `null` for Low confidence cards. Hot badges only appear on Medium+ confidence data.

The confidence label appears in the `RoiFeedCard` row as a color-coded pill:
- High: green
- Medium: amber
- Low: muted red

**Note:** Confidence is not gem rate. GemRate data (PSA population count + match confidence) is now integrated via `tcg-gemrate-search` and shows as "Pop NNNN" with a High/Med/Low confidence pill in `TerminalCard`. This is population count — how many copies have been graded — not true gem rate (% that grade PSA 10).

---

## 8. Hot Cards System

"Hot" cards are those showing one of four specific opportunity patterns. Badges appear in:
- `DiscoveryPanel` → Hot Right Now grid (top 6 cards with any hotness label)
- `RoiFeedCard` → inline badge in the Top ROI list
- `TerminalCard` → image overlay badge after PriceCharting price resolves

### Four labels

| Label | Criteria | What it signals |
|-------|----------|-----------------|
| New Release | Name contains known new-set token (sv09, op12, twilight masquerade, etc.) | Recent set — price discovery in progress |
| High Upside | ROI ≥ 200% AND raw $10–$80 | High percentage gain in an accessible price range |
| High Spread | Profit ≥ $80 | Meaningful dollar opportunity regardless of % |
| Heating Up | ROI ≥ 50% AND name contains a heat character (charizard, luffy, mewtwo, etc.) | Popular character with growing spread |

**Priority order** (only one label fires per card): New Release → High Upside → High Spread → Heating Up.

**Constraint:** Hotness only fires for Medium+ confidence cards. This is deliberate — hot badges on low-confidence data are misleading.

**Current limitation:** "Hot" is purely heuristic based on static thresholds against PriceCharting snapshot data. There is no time-series tracking, search frequency signal, or spread change detection. A card labeled "Spread Widening" has a spread ≥ $80 right now — it does not mean the spread is growing.

---

## 9. UI/UX Structure

### Page: `/tcg` (TcgLab)

Three states:

1. **Idle (no game/entity selected, guided mode):** `DiscoveryPanel` renders
2. **Guided search (entity selected):** `TerminalView` with guided search params
3. **Quick search (free text entered):** `TerminalView` with raw query

### DiscoveryPanel (`src/components/tcg-lab/DiscoveryPanel.tsx`)

- Game selector (Pokémon / One Piece)
- **Hot Right Now** grid: up to 6 cards with a hotness label. Each card shows product name, Raw/PSA 10 prices, profit, ROI, and hotness badge.
- **Top ROI Opportunities** list: bucket tabs filter the ranked card list.
  - High Confidence (default): `confidenceLabel = 'High'` AND `profit ≥ $40`
  - Best ROI: `roi ≥ 100%` AND not Low confidence
  - Best Spread: `profit ≥ $50` AND not Low confidence
  - Emerging: everything else
- Each list item is a `RoiFeedCard`

### RoiFeedCard (`src/components/tcg-lab/RoiFeedCard.tsx`)

Compact row showing:
- Rank number
- Product name (truncated)
- Raw price · PSA 10 price · Gem (placeholder `—`)
- Confidence label pill (High/Med/Low)
- Hot badge (if applicable)
- Profit (+$XX) and ROI (XX%)
- External link icon on hover → eBay sold PSA 10 comps

### TerminalCard (`src/components/tcg-lab/TerminalCard.tsx`)

Card tile for eBay listings. Includes:
- eBay listing image (aspect-square)
- Listing price (BIN or auction current bid)
- Card title (cleaned of emoji/excess whitespace, truncated to 60 chars)
- Profit block (only for BIN listings): appears after lazy `usePricechartingLookup` resolves
  - Label: **"Spread Est."** — clarifies this is an estimate, not a guaranteed profit
  - Shows: Raw est. · PSA 10 est. · Pop (GemRate total grades) + confidence pill
  - Shows: Profit (+$XX or -$XX in green/red) and ROI%
  - `approx.` marker appears for medium/low-confidence matches
  - Shows "No PSA 10 data" only when no match exists (low-confidence matches ARE shown)
- Hot badge in image overlay (top-left, below eBay chip)
- Watchlist star (session-only, no persistence)
- "PSA 10" button → eBay sold comps link
- "Gem" button → gemrate.com search link (opens GemRate for further population research)
- Copy button → copies cleaned title to clipboard

### TcgHeader (`src/components/tcg-lab/TcgHeader.tsx`)

Navigation bar below the main nav. Contains:
- Game tabs (Pokémon / One Piece)
- Mode toggle (Guided / Quick)
- Entity dropdown (guided mode, from `tcg_entities`)
- Set dropdown (guided mode, from `tcg_sets`)
- Free text input (quick mode)

### TabNavigation (`src/components/TabNavigation.tsx`)

Sticky top header on desktop; fixed bottom bar on mobile.

- Desktop: Logo, nav links (TCG Market, Sports [Beta]), search input, theme toggle, watchlist dropdown
- Mobile: Bottom tab bar with Search, TCG, Sports, theme toggle icons

---

## 10. Environment Variables

### Frontend (must have `VITE_` prefix to be accessible via `import.meta.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (`https://paknqtrhsmyrhasujbsi.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |

These are set as Vercel Production environment variables. Pull them locally:
```bash
npx vercel env pull --environment=production .env.local
```

### Backend (Supabase Edge Functions — set in Supabase Dashboard → Project Settings → Edge Functions)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Same URL as above (auto-injected by Supabase runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — bypasses RLS |
| `EBAY_CLIENT_ID` | Yes | eBay OAuth app ID |
| `EBAY_CLIENT_SECRET` | Yes | eBay OAuth client secret |

### Deprecated / unused (do not add these)

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_*` | Invalid | Project is not Next.js — these vars have no effect |
| `SUPABASE_SECRET_KEY` | Unused | Old naming; use `SUPABASE_SERVICE_ROLE_KEY` |
| `SUPABASE_ANON_KEY` (no VITE_ prefix) | Not browser-accessible | Without `VITE_` prefix, invisible to frontend |
| `SUPABASE_PUBLISHABLE_KEY` | Unused stale var | Can be removed from Vercel |
| `POSTGRES_*` | Unused | Direct Postgres connection vars, not used by app |
| `TURBO_*`, `NX_DAEMON` | Unused | Build tool vars, no effect |

---

## 11. Edge Functions

All edge functions are deployed to Supabase (`supabase/functions/`), written in Deno/TypeScript, and invoked via `supabase.functions.invoke()` from the frontend (which auto-attaches the anon JWT).

### `tcg-ebay-search`

**Purpose:** Proxy to eBay Browse API (active listings) and eBay Finding API (sold listings). The edge function holds eBay credentials — they never touch the browser.

**Invocation:**
```typescript
await supabase.functions.invoke('tcg-ebay-search', {
  body: { action: 'active' | 'sold', query, limit, sort, cardType, minPrice, maxPrice, offset }
});
```

**Actions:**
- `active` → eBay Browse API v1 (`/buy/browse/v1/item_summary/search`). Returns `{ items, total, hasMore, offset }`.
- `sold` → eBay Finding API (`findCompletedItems`). Returns `{ soldItems, metrics: { salesLast7Days, medianSoldPrice } }`.

**Token behavior:** eBay OAuth client credentials token is cached in Deno module scope for the function's lifetime. Refreshes 5 minutes before expiry. eBay tokens are valid for ~2 hours.

**Query construction:**
- Decorative terms (alt art, full art, illustration rare, etc.) are stripped from the query before sending to eBay to maximize result breadth, then results containing those terms are re-boosted to the top client-side.
- Exclusion string (junk lots, sealed, graded) is appended to the eBay query directly: `-lot -bundle -"elite trainer"` etc.
- Always targets eBay category `183454` (TCG singles).

**Risks:**
- eBay rate limiting: The Browse API has undisclosed rate limits. High-traffic usage may hit them. No retry logic currently.
- eBay credentials rotation: If `EBAY_CLIENT_ID` or `EBAY_CLIENT_SECRET` expire or are revoked, all searches break silently from the user's perspective.

---

### `pricecharting-tcg-lookup`

**Purpose:** Matches an eBay listing title to a PriceCharting card in the local database and returns raw + PSA 10 market prices.

**Invocation:**
```typescript
await supabase.functions.invoke('pricecharting-tcg-lookup', {
  body: { sourceTitle: listing.title, category?: 'pokemon' | 'onepiece' }
});
```

**Response:**
```json
{
  "status": "success" | "no_match",
  "matchConfidence": "high" | "medium" | "low",
  "matchedProductName": "Charizard ex 199/165",
  "rawMarketValue": 45.00,
  "psa10MarketValue": 180.00,
  "estimatedProfit": 110.00,
  "roiPercent": 244,
  "priceSource": "pricecharting"
}
```

**Matching logic:**
1. Normalize title: strip grader labels (PSA 10, BGS 9.5), noise words, non-alphanumeric
2. Extract card number (regex: Pokémon `025/198`, One Piece `OP13-118`, hash `#025`)
3. Cache check on `pricecharting_cache` (24hr TTL)
4. Query DB: card number path (precise, 20 results) → token path (main 4+ char token, 40 results)
5. Score candidates: card number match = +60, token overlap = +5 per token
6. Threshold: score ≥ 15 required for any match; confidence = high (≥60) / medium (≥30) / low (<60)
7. Write result to cache; return

**JWT requirement:** This function uses service role internally. The caller's anon JWT is not inspected for authorization — any valid Supabase JWT (including anon) is accepted. There is no abuse protection beyond the Supabase project-level rate limits.

**Risks:**
- If `pricecharting_tcg_cards` data goes stale, prices will be wrong. There is no automated refresh pipeline currently.
- The 24-hour cache means price corrections take up to 24h to propagate to already-cached titles.
- High eBay listing volume (many unique cards) will generate many cache misses. Each miss is a DB query — acceptable at current scale.

---

### `tcg-gemrate-search`

**Purpose:** Looks up a card's PSA population count on GemRate by name. Returns total grades and a match confidence level.

**Invocation:**
```typescript
await supabase.functions.invoke('tcg-gemrate-search', {
  body: { product_name: string, normalized_name: string, category: 'pokemon' | 'one_piece' }
});
```

**Response:**
```json
{
  "totalGrades": 4821,
  "confidence": "high" | "medium" | "low"
}
```

**Integration:** `useTcgGemRateSearch` hook uses `IntersectionObserver` (same pattern as `usePricechartingLookup`) to fire lazily when a card scrolls into view. Both refs are merged onto the same DOM element via a callback ref in `TerminalCard`. The pop count + confidence appear in the "Spread Est." block alongside raw/PSA 10 estimates.

**Note:** This returns *total population* (how many copies have been graded by PSA), not true gem rate (% grading PSA 10). Useful as a supply scarcity signal.

---

### Sports edge functions (beta)

| Function | Purpose |
|----------|---------|
| `sports-ebay-search` | eBay search for sports cards |
| `sports-ebay-gem-rate` | PSA population report lookup |
| `sports-ebay-psa10-active` | Active PSA 10 listings for a sports card |
| `sports-ebay-sold-psa` | Sold PSA 10 comps for sports cards |

These are not the primary focus. The `sports-ebay-gem-rate` function requires `Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}` when called via direct `fetch()` (not `supabase.functions.invoke()`).

---

## 12. Performance Considerations

### Current bottlenecks

**Client-side scoring at 600 rows:** `useTopRoi` fetches 600 rows from `pricecharting_tcg_cards` and scores/filters/sorts them in JavaScript. At 600 rows this is imperceptible (<5ms). It becomes meaningful if the fetch grows beyond ~5,000 rows.

**ILIKE full scans:** The `pricecharting-tcg-lookup` edge function uses `ILIKE '*token*'` queries on `normalized_name`. These are full-table scans. At 85k rows, each query takes ~10–50ms depending on Supabase load. Acceptable now.

### Future optimization: `pg_trgm` index

```sql
-- Run once in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_pricecharting_tcg_normalized_trgm
  ON pricecharting_tcg_cards USING gin (normalized_name gin_trgm_ops);
```

This drops ILIKE query time from O(n) to O(log n). High priority once the table exceeds 200k rows.

### Future optimization: Server-side scoring RPC

A migration file exists at `supabase/migrations/20260422200000_tcg_top_roi_rpc.sql` that creates a `get_tcg_top_roi()` Postgres function computing the blended score in SQL. This has not been applied to the database. Applying it and switching `useTopRoi` to `supabase.rpc('get_tcg_top_roi', ...)` would:
- Eliminate the 600-row client fetch
- Enable server-side limit (fetch only the top N directly)
- Reduce bandwidth by ~90%

To apply: authenticate Supabase CLI (`npx supabase login`) and run `npx supabase db push --linked --yes`.

### React Query caching

`useTopRoi` uses `staleTime: 10 * 60_000` (10 minutes). The same data is reused across game tab switches unless the query key changes. `useTcgEntities` uses 10 minutes. `usePricechartingCards` uses 5 minutes.

### Lazy loading of listings

`usePricechartingLookup` uses `IntersectionObserver` with `rootMargin: '150px'` to pre-load card prices before they enter the viewport. This keeps the initial page load fast (no PSA 10 lookups until cards are visible) and prevents fetching data for cards the user never scrolls to.

---

## 13. Known Issues / Tech Debt

| Issue | Severity | Notes |
|-------|----------|-------|
| **Gem rate shows population, not gem %** | Low | `tcg-gemrate-search` returns total PSA grades (population). True gem rate (% that grade PSA 10) is not yet computed. Pop count is still useful signal for supply scarcity. |
| **Hot feed is fully heuristic** | Medium | Hot badges reflect static price thresholds, not trend data. No time-series pricing. A card can stay "Hot" indefinitely with no real momentum. |
| **No PriceCharting refresh pipeline** | Medium | `pricecharting_tcg_cards` is a static snapshot. Prices drift over time. Without a scheduled refresh job, the data will age. |
| **`tcg_entities` coverage is thin** | Low-Medium | 20 entities. Searching for a card not in the entity list requires using quick/free search mode. |
| **Client-side scoring scalability** | Low (now) | 600-row client-side fetch is fine at current scale. Will need the RPC approach if the table or fetch limit grows. |
| **Pending migration unapplied** | Low | `20260422200000_tcg_top_roi_rpc.sql` creates the `get_tcg_top_roi` RPC. The app does not use it, but it is in the repo. Apply or delete it. |
| **`tcg_targets` partially superseded** | Low | `tcg_targets` and `tcg_sets` / `tcg_traits` are the legacy guided search system. `tcg_entities` is the new system. The hooks for targets/traits still exist and are used in some components. |
| **No error monitoring** | Low | No Sentry, no Datadog. Errors surface in Vercel runtime logs only. Adding Sentry would take ~30 minutes. |
| **eBay token in Deno module scope** | Low | The eBay OAuth token is cached in a module-level variable. If the edge function cold-starts, it re-fetches. Not a bug, but it means the first request after a cold start has extra latency (~200ms). |
| **Stale Vercel env vars** | Low | Several deprecated vars exist in Vercel (`SUPABASE_PUBLISHABLE_KEY`, `POSTGRES_*`, `TURBO_*`). They are inert but cluttering. |

---

## 14. Roadmap (Engineering Priorities)

### Phase 1 — Scoring + data quality (immediate)

- **Apply `pg_trgm` index** on `normalized_name` for faster edge function lookups
- **Expand `tcg_entities`** to 50–100 entries covering major characters per game
- **Confidence threshold tuning** — evaluate whether `CONFIDENCE_HIGH: 70` and `CONFIDENCE_MEDIUM: 45` produce correct segmentation across real data; adjust if needed
- **Deduplicate entity → target mapping** — consolidate `tcg_targets` into `tcg_entities` and retire the legacy tables
- **Add explicit `category` filter** to `pricecharting-tcg-lookup` — currently it auto-detects from title keywords, which occasionally misclassifies Pokémon cards as One Piece

### Phase 2 — Feed improvements + RPC

- **Apply `get_tcg_top_roi` RPC migration** and switch `useTopRoi` to use it — eliminates 600-row client fetch
- **Time-series price snapshots** — daily cron job (Supabase or Vercel) to store `pricecharting_tcg_cards` price diffs; enables "spread growing" as a real signal instead of a heuristic
- **Hot feed v2** — surface cards whose spread has grown >X% in 7 days, using snapshot diffs
- **Sold comps in TCG view** — extend `tcg-ebay-search` sold results to appear in `TerminalCard`, same as the sports `SoldCompsDialog` pattern
- **Set-level browse** — allow browsing all high-ROI cards within a specific set (e.g. "Best opportunities in Stellar Crown")

### Phase 3 — Gem rate + analytics + monetization

- **Gem rate integration** — PSA Pop Report lookup per card. Options: scraping PSA website (ToS risk), licensed PSA data feed, user-contributed data. Surface as `gemRate: number | null` replacing the `—` placeholder.
- **Advanced opportunity score** — incorporate gem rate as a fourth scoring dimension: `opportunityScore = roi(40) + spread(30) + confidence(15) + chaseBoost(10) + gemRateSignal(5)`
- **User accounts + persistent watchlists** — enable Supabase Auth (magic link or Google OAuth), migrate in-memory watchlists to a `user_watchlist` table
- **Price alerts** — user subscribes to a card; gets notified (email or push) when the profit spread exceeds a threshold
- **Monetization hooks** — Pro tier with: alert limits, export (CSV), advanced filters (gem rate range, confidence-only view), early access to Phase 2 features

---

## 15. Deployment Flow

### Standard deploy

```
git commit → git push origin main → Vercel auto-deploys from main
```

Vercel build command: `npm run build` (Vite production build)  
Output directory: `dist/`  
Build time: ~1.4 seconds  
No build-time environment variables required beyond Vite's standard env var handling.

### Supabase Edge Function deploy

```bash
# Deploy a single function
npx supabase functions deploy pricecharting-tcg-lookup --project-ref paknqtrhsmyrhasujbsi

# Deploy all functions
npx supabase functions deploy --project-ref paknqtrhsmyrhasujbsi
```

Edge function secrets (env vars) are set separately in Supabase Dashboard → Project Settings → Edge Functions → Secrets.

### Supabase database migrations

```bash
# Authenticate once
npx supabase login

# Link to project
npx supabase link --project-ref paknqtrhsmyrhasujbsi

# Push all unapplied migrations
npx supabase db push --linked --yes
```

Migration files live in `supabase/migrations/` and are named with timestamps. They are applied in timestamp order. **The migration `20260422200000_tcg_top_roi_rpc.sql` has not been applied to production** — apply it or remove the file.

### Vercel environment variable management

```bash
# Pull production env for local use
npx vercel env pull --environment=production .env.local

# Add a new production env var
npx vercel env add VARIABLE_NAME production

# Remove a var
npx vercel env rm VARIABLE_NAME production --yes
```

---

## 16. How to Run / Develop Locally

### Requirements

- Node.js ≥ 20 (project uses `v24.x` in production)
- npm ≥ 10

### Install

```bash
git clone https://github.com/PunkMunk-dev/omnimarket-cards.git
cd omnimarket-cards
npm install
```

### Environment setup

```bash
# Option A: Pull from Vercel (requires npx vercel login first)
npx vercel env pull --environment=production .env.local

# Option B: Create manually
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://paknqtrhsmyrhasujbsi.supabase.co
VITE_SUPABASE_ANON_KEY=<get from Supabase Dashboard → API Settings>
EOF
```

### Run dev server

```bash
npm run dev
# Vite dev server starts at http://localhost:8080
```

### Type check

```bash
npx tsc --noEmit
```

### Build (production)

```bash
npm run build
# Output in dist/
```

### Test

```bash
npx vitest run
# Tests in src/test/ and src/lib/*.test.ts
```

### Supabase connection notes

The local dev server connects directly to the **production** Supabase project using the anon key. There is no local Supabase instance configured. All reads from `pricecharting_tcg_cards`, `tcg_entities`, etc. hit production data.

Edge function calls (`supabase.functions.invoke()`) also hit production edge functions. This means:
- eBay searches in local dev consume eBay API quota
- `pricecharting-tcg-lookup` writes to the production `pricecharting_cache` table
- Be mindful of this during development to avoid unnecessary API calls

If isolated development is needed, provision a separate Supabase project, seed it with a subset of `pricecharting_tcg_cards`, and update `.env.local` accordingly.

---

## 17. Final Notes for the Developer

### System philosophy

**High-signal over high-volume.** The scoring engine raises price floors ($15 raw, $50 graded) and penalizes suspicious data via the confidence system precisely to produce a shorter, more actionable list. Resist the urge to lower floors or remove filters to "show more cards" — this will surface garbage and erode trust in the ranking.

**Keep scoring centralized.** All scoring constants and logic live in `src/lib/tcgScoring.ts`. When adding new signals (gem rate, velocity, etc.), add them there first, then thread through `useTopRoi`. Components should read scores off `TopRoiCard` — they should not compute scores themselves.

**Confidence is a first-class citizen.** The confidence label is not cosmetic. It gates hotness badges, influences opportunity rank, and determines bucket membership. Any new signal that derives from `pricecharting_tcg_cards` data should be gated on at least Medium confidence before surfacing to users.

**The PriceCharting matching is heuristic.** The edge function does its best with token overlap and card number extraction, but mismatches happen. The `matchConfidence` field exists for this reason. Low-confidence matches are suppressed client-side. If users report wrong prices on specific cards, the issue is almost always in `normalizeTitle()` or the scoring thresholds in `scoreMatch()`.

**Avoid overengineering the sports tab.** Sports is feature-complete for beta. Do not invest in sports infrastructure until TCG is proven and user demand is established.

**The RPC migration is the next database action.** `supabase/migrations/20260422200000_tcg_top_roi_rpc.sql` is sitting unapplied. If the client-side 600-row fetch ever becomes a performance issue, apply it and swap `useTopRoi` to use `supabase.rpc()`. The migration is already written.

---

## Appendix: Key File Map

```
src/
├── lib/
│   ├── tcgScoring.ts          ← ALL scoring logic. Start here.
│   ├── tcgFilters.ts          ← eBay listing post-processing (junk filter, dedupe)
│   ├── cleanTitle.ts          ← eBay title normalization for display
│   └── rankListings.ts        ← (legacy) listing ranking — check if still used
│
├── hooks/
│   ├── useTopRoi.ts               ← Top ROI feed data fetch + scoring pipeline
│   ├── useTcgData.ts              ← Entity/set/trait/target data hooks
│   ├── usePricechartingLookup.ts  ← Per-card lazy price lookup (IntersectionObserver)
│   ├── useTcgGemRateSearch.ts     ← Per-card lazy GemRate pop lookup (IntersectionObserver)
│   └── useSportsGemRate.ts        ← Sports gem rate (requires manual auth header)
│
├── components/tcg-lab/
│   ├── DiscoveryPanel.tsx     ← Hot cards + Top ROI feed (idle state)
│   ├── RoiFeedCard.tsx        ← Single row in ROI list (shows confidence)
│   ├── HotBadge.tsx           ← Hot label badge component
│   ├── TerminalCard.tsx       ← eBay listing card tile
│   ├── TerminalView.tsx       ← eBay search results grid + toolbar
│   └── TcgHeader.tsx          ← Game/entity/mode selector header
│
├── services/
│   └── tcgEbayService.ts      ← searchActiveListings() / searchSoldListings()
│
├── types/
│   ├── tcg.ts                 ← EbayListing, Game, SearchFilters, etc.
│   └── pricecharting.ts       ← PricechartingResult type
│
└── integrations/supabase/
    └── client.ts              ← Supabase client (anon key)

supabase/
├── functions/
│   ├── tcg-ebay-search/           ← eBay Browse + Finding API proxy
│   ├── pricecharting-tcg-lookup/  ← Title → PriceCharting card matcher (GENERIC_TOKENS fix applied)
│   └── tcg-gemrate-search/        ← Card name → GemRate population count
│
└── migrations/
    ├── 20260422161439_tcg_entities.sql    ← Applied: adds sort_order, seeds 20 entities
    ├── 20260424000002_tcg_entities_create.sql ← Applied: CREATE TABLE IF NOT EXISTS + upsert
    └── 20260422200000_tcg_top_roi_rpc.sql ← NOT APPLIED: get_tcg_top_roi() function
```

---

**Save this file as `omnimarket-handoff.md`** in the repository root or distribute directly to the incoming engineer.

**Optional: split into `docs/` folder**

If the document grows (multiple contributors, versioned sections), split as:

```
docs/
├── 01-architecture.md
├── 02-database-schema.md
├── 03-scoring-engine.md
├── 04-edge-functions.md
├── 05-deployment.md
└── 06-roadmap.md
```

Reference from a `docs/README.md` index. Keep `tcgScoring.ts` as the authoritative scoring source regardless of documentation structure.
