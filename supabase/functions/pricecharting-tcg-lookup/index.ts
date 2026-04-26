import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRADING_COST = 25; // USD
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// ── Normalization ────────────────────────────────────────────────────────────

// Generic words that appear in almost every eBay TCG listing title.
// Using them as the primary DB search token returns thousands of unrelated rows.
const GENERIC_TOKENS = new Set([
  'pokemon', 'piece', 'card', 'cards', 'trading', 'tcg',
  'single', 'english', 'japanese', 'korean', 'chinese',
  'the', 'and', 'for', 'with',
  // eBay listing noise — never appear in PriceCharting product names
  'guaranteed', 'authentic', 'vintage', 'bundle', 'custom', 'proxy',
  'playset', 'digital', 'online', 'code', 'choose', 'random',
  'deckbox', 'sleeves', 'toploader',
]);

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    // Strip grader + grade: "PSA 10", "BGS 9.5", "CGC 8"
    .replace(/\b(psa|bgs|cgc|sgc|beckett|ace)\s*\d+(\.\d+)?\b/g, '')
    // Strip condition / noise words
    .replace(/\b(mint|near\s*mint|nm-m|nm|lp|mp|hp|poor|graded|raw|ungraded|lot|wow|holo\s*rare)\b/g, '')
    // Strip TCG-specific generic prefixes that just add noise
    .replace(/\b(pokemon|one\s*piece|trading\s*card\s*game|tcg|card|cards|english|japanese)\b/g, '')
    // Strip eBay listing noise that never appears in card product names
    .replace(/\b(guaranteed|authentic|vintage|bundle|custom|proxy|playset|digital|online|choose|random|deckbox|sleeves|toploader)\b/g, '')
    // Keep only alphanumeric, spaces, #, /, -
    .replace(/[^a-z0-9\s#/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCardNumber(title: string): string | null {
  // One Piece style: OP13-118, EB01-001, ST01-001
  const op = title.match(/\b([A-Z]{2,4}\d{2}-\d{3,4})\b/i);
  if (op) return op[1].toUpperCase();
  // Standard set fraction: 025/198
  const setFraction = title.match(/\b(\d{3}\/\d{3,4})\b/);
  if (setFraction) return setFraction[1];
  // Hash number: #025
  const hash = title.match(/#(\d{3})\b/);
  if (hash) return `#${hash[1]}`;
  return null;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

// Pick the most specific (non-generic) token for the primary DB search.
function pickMainToken(tokens: string[]): string | null {
  const specific = tokens
    .filter(t => t.length >= 4 && !GENERIC_TOKENS.has(t))
    .sort((a, b) => b.length - a.length);
  if (specific.length > 0) return specific[0];
  const any4 = tokens.find(t => t.length >= 4);
  if (any4) return any4;
  return tokens[0] ?? null;
}

// ── One Piece set mapping ────────────────────────────────────────────────────
// Maps OP set codes extracted from eBay titles to PriceCharting console names.
// Used for set-level query before falling back to category search.
// Incorrect or unmapped codes are safe — the fallback handles them.

const OP_SET_MAP: Record<string, string> = {
  OP01: 'One-Piece-Romance-Dawn',
  OP02: 'One-Piece-Paramount-War',
  OP03: 'One-Piece-Pillars-of-Strength',
  OP04: 'One-Piece-Kingdoms-of-Intrigue',
  OP05: 'One-Piece-Awakening-of-the-New-Era',
  OP06: 'One-Piece-Wings-of-the-Captain',
  OP07: 'One-Piece-500-Years-in-the-Future',
  OP08: 'One-Piece-Two-Legends',
  OP09: 'One-Piece-The-Four-Emperors',
  OP10: 'One-Piece-Royal-Blood',
  OP11: 'One-Piece-Nikas-Liberation',
  OP12: 'One-Piece-Legacy-of-the-Master',
};

/** Extract e.g. "OP07" from "OP07-119 Luffy Alt Art" → returns "OP07" or null */
function extractOpSetCode(title: string): string | null {
  const m = title.match(/\b(OP\d{2})\b/i);
  return m ? m[1].toUpperCase() : null;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

interface DbCard {
  id: number;
  category: string;
  product_name: string;
  console_name: string;
  normalized_name: string;
  loose_price: number | null;
  graded_price: number | null;
  grade9_price: number | null;
}

interface MatchResult {
  status: 'success';
  matchConfidence: 'high' | 'medium' | 'low';
  matchedProductName: string;
  consoleName?: string;
  rawMarketValue: number | null;
  psa9MarketValue: number | null;
  psa10MarketValue: number | null;
  estimatedProfit: number | null;
  roiPercent: number | null;
  priceSource: 'pricecharting';
  pricecharting_id: number;
}

function buildResult(card: DbCard, confidence: 'high' | 'medium' | 'low'): MatchResult {
  const rawMarketValue  = card.loose_price  ?? null;
  const psa9MarketValue = card.grade9_price ?? null;
  const psa10MarketValue = card.graded_price ?? null;

  const estimatedProfit =
    psa10MarketValue !== null
      ? Math.round((psa10MarketValue - (rawMarketValue ?? 0) - GRADING_COST) * 100) / 100
      : null;

  const roiPercent =
    estimatedProfit !== null && rawMarketValue !== null && rawMarketValue > 0
      ? Math.round((estimatedProfit / rawMarketValue) * 100)
      : null;

  return {
    status: 'success',
    matchConfidence: confidence,
    matchedProductName: card.product_name,
    consoleName: card.console_name || undefined,
    rawMarketValue,
    psa9MarketValue,
    psa10MarketValue,
    estimatedProfit,
    roiPercent,
    priceSource: 'pricecharting',
    pricecharting_id: card.id,
  };
}

function scoreMatch(
  queryTokens: string[],
  queryCardNum: string | null,
  requiredCategory: string | null,
  card: DbCard
): number {
  if (requiredCategory && card.category !== requiredCategory) return -1;

  let score = 0;

  if (queryCardNum) {
    const numLower = queryCardNum.toLowerCase();
    if (card.normalized_name.includes(numLower)) {
      score += 60;
    } else {
      const numOnly = numLower.replace(/[^0-9]/g, '');
      if (numOnly.length >= 3 && card.normalized_name.replace(/[^0-9]/g, '').includes(numOnly)) {
        score += 20;
      }
    }
  }

  const nameTokens = new Set(card.normalized_name.split(/\s+/));
  for (const t of queryTokens) {
    if (!GENERIC_TOKENS.has(t) && nameTokens.has(t)) score += 5;
  }

  return score;
}

// ── Supabase queries ─────────────────────────────────────────────────────────

const CARD_SELECT = 'select=id,category,product_name,console_name,normalized_name,loose_price,graded_price,grade9_price';

async function queryCardById(
  id: number,
  supabaseUrl: string,
  serviceKey: string,
): Promise<DbCard | null> {
  const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?id=eq.${id}&${CARD_SELECT}&limit=1`;
  const res = await fetch(url, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!res.ok) return null;
  const rows: DbCard[] = await res.json();
  return rows[0] ?? null;
}

async function queryCards(
  normalized: string,
  cardNum: string | null,
  category: string | null,
  consoleFilter: string | null,  // optional set-level filter (used for One Piece)
  supabaseUrl: string,
  serviceKey: string,
): Promise<DbCard[]> {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const catFilter = category ? `&category=eq.${encodeURIComponent(category)}` : '';

  // Primary: card number lookup (most precise)
  if (cardNum) {
    const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(cardNum.toLowerCase())}*&${CARD_SELECT}${catFilter}&limit=20`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const rows: DbCard[] = await res.json();
      if (rows.length > 0) return rows;
    }
  }

  const tokens = tokenize(normalized);
  const mainToken = pickMainToken(tokens);
  if (!mainToken) return [];

  // Set-level query for One Piece (more precise, avoids cross-set false positives)
  if (consoleFilter) {
    const consoleEnc = encodeURIComponent(consoleFilter);
    const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(mainToken)}*&console_name=ilike.*${consoleEnc}*&${CARD_SELECT}&limit=30`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const rows: DbCard[] = await res.json();
      if (rows.length > 0) return rows;
    }
    // Fallback: set-level returned nothing — try category-level
  }

  // Category-level fallback (or primary for Pokémon)
  const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(mainToken)}*&${CARD_SELECT}${catFilter}&limit=60`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  return await res.json() as DbCard[];
}

// ── Live API fallback ────────────────────────────────────────────────────────
// Only used when PRICECHARTING_API_KEY is set AND local DB returns no_match.

interface ApiProduct {
  id: string;
  'product-name': string;
  'console-name': string;
  'loose-price'?: number;
  'graded-price'?: number;
  'grade9-price'?: number;
  [key: string]: unknown;
}

function apiProductToDbCard(p: ApiProduct): DbCard {
  // API returns prices in pennies; DB stores dollars
  const penniesOrNull = (v: number | undefined) => (v != null && v > 0 ? v / 100 : null);
  const consoleRaw = (p['console-name'] ?? '').toLowerCase();
  const category = consoleRaw.includes('one-piece') || consoleRaw.includes('one_piece')
    ? 'onepiece'
    : 'pokemon';
  return {
    id: parseInt(p.id, 10),
    category,
    product_name: p['product-name'] ?? '',
    console_name: p['console-name'] ?? '',
    normalized_name: (p['product-name'] ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim(),
    loose_price:   penniesOrNull(p['loose-price']),
    graded_price:  penniesOrNull(p['graded-price']),
    grade9_price:  penniesOrNull(p['grade9-price']),
  };
}

async function liveApiFallback(
  normalizedQuery: string,
  queryTokens: string[],
  cardNum: string | null,
  detectedCategory: string,
  apiKey: string,
): Promise<{ card: DbCard; confidence: 'high' | 'medium' | 'low' } | null> {
  const q = encodeURIComponent(normalizedQuery.slice(0, 80)); // max safe query length
  const url = `https://www.pricecharting.com/api/products?t=${apiKey}&q=${q}`;

  let raw: unknown;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    raw = await res.json();
  } catch {
    return null;
  }

  const data = raw as { status?: string; products?: ApiProduct[] };
  if (data.status !== 'success' || !Array.isArray(data.products)) return null;

  const candidates = data.products.map(apiProductToDbCard);
  const scored = candidates
    .map(c => ({ card: c, score: scoreMatch(queryTokens, cardNum, detectedCategory, c) }))
    .filter(x => x.score >= 5)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const best = scored[0];
  const confidence: 'high' | 'medium' | 'low' =
    best.score >= 60 ? 'high' : best.score >= 25 ? 'medium' : 'low';

  return { card: best.card, confidence };
}

// ── Cache ────────────────────────────────────────────────────────────────────

interface CacheRow {
  result: Record<string, unknown>;
  cached_at: string;
  pricecharting_id: number | null;
}

async function readCacheRow(
  key: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<CacheRow | null> {
  const url = `${supabaseUrl}/rest/v1/pricecharting_cache?normalized_query=eq.${encodeURIComponent(key)}&select=result,cached_at,pricecharting_id&limit=1`;
  const res = await fetch(url, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as CacheRow;
}

async function writeCache(
  key: string,
  result: unknown,
  pricechartingId: number | null,
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/pricecharting_cache`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      normalized_query: key,
      result,
      cached_at: new Date().toISOString(),
      ...(pricechartingId != null ? { pricecharting_id: pricechartingId } : {}),
    }),
  });
}

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { sourceTitle, category } = await req.json() as { sourceTitle?: string; category?: string };

    if (!sourceTitle || typeof sourceTitle !== 'string') {
      return new Response(JSON.stringify({ error: 'sourceTitle required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase env vars missing');

    const normalized  = normalizeTitle(sourceTitle);
    const cacheKey    = `csv3:${category ?? 'auto'}:${normalized}`;

    // ── Cache read ──
    const cacheRow = await readCacheRow(cacheKey, supabaseUrl, serviceKey);
    if (cacheRow) {
      const ageMs = Date.now() - new Date(cacheRow.cached_at).getTime();

      // Fresh hit → return immediately
      if (ageMs < CACHE_TTL_MS) {
        return new Response(JSON.stringify(cacheRow.result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Stale but we have a product ID → refresh via direct row lookup (no fuzzy match)
      if (cacheRow.pricecharting_id != null) {
        const card = await queryCardById(cacheRow.pricecharting_id, supabaseUrl, serviceKey);
        if (card) {
          // Re-use 'high' confidence — this is a deterministic match by ID
          const result = buildResult(card, 'high');
          writeCache(cacheKey, result, card.id, supabaseUrl, serviceKey).catch(() => {});
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Card was deleted from DB — fall through to fuzzy match
      }
    }

    // ── Full fuzzy match ──
    const cardNum = extractCardNumber(sourceTitle);
    const queryTokens = tokenize(normalized);

    const detectedCategory = category
      ?? (sourceTitle.toLowerCase().match(/\b(op|one.?piece)\b/) ? 'onepiece' : 'pokemon');

    // For One Piece: try set-level filter first (reduces false cross-set positives)
    let consoleFilter: string | null = null;
    if (detectedCategory === 'onepiece') {
      const opCode = extractOpSetCode(sourceTitle);
      if (opCode && OP_SET_MAP[opCode]) {
        consoleFilter = OP_SET_MAP[opCode];
      }
    }

    const candidates = await queryCards(normalized, cardNum, detectedCategory, consoleFilter, supabaseUrl, serviceKey);

    if (candidates.length === 0) {
      // ── Live API fallback (only when PRICECHARTING_API_KEY is set) ──
      const apiKey = Deno.env.get('PRICECHARTING_API_KEY');
      if (apiKey) {
        const apiHit = await liveApiFallback(normalized, queryTokens, cardNum, detectedCategory, apiKey);
        if (apiHit) {
          const result = buildResult(apiHit.card, apiHit.confidence);
          // Cache for 48h (live API data, slightly longer TTL to reduce re-fetches)
          writeCache(cacheKey, result, apiHit.card.id, supabaseUrl, serviceKey).catch(() => {});
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ status: 'no_match' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Score and rank
    const scored = candidates
      .map(c => ({ card: c, score: scoreMatch(queryTokens, cardNum, detectedCategory, c) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0 || scored[0].score < 5) {
      return new Response(JSON.stringify({ status: 'no_match' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const best = scored[0];
    const confidence: 'high' | 'medium' | 'low' =
      best.score >= 60 ? 'high' : best.score >= 25 ? 'medium' : 'low';

    const result = buildResult(best.card, confidence);

    writeCache(cacheKey, result, best.card.id, supabaseUrl, serviceKey).catch(() => {});

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('pricecharting-tcg-lookup error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
