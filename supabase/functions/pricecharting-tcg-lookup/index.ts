import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRADING_COST = 25; // USD

// ── Normalization ────────────────────────────────────────────────────────────

// Generic words that appear in almost every eBay TCG listing title.
// Using them as the primary DB search token returns thousands of unrelated rows.
const GENERIC_TOKENS = new Set([
  'pokemon', 'piece', 'card', 'cards', 'trading', 'tcg',
  'single', 'english', 'japanese', 'korean', 'chinese',
  'the', 'and', 'for', 'with',
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
  // Prefer the longest non-generic token (usually the character/Pokémon name)
  const specific = tokens
    .filter(t => t.length >= 4 && !GENERIC_TOKENS.has(t))
    .sort((a, b) => b.length - a.length);
  if (specific.length > 0) return specific[0];
  // Fallback to any token with length >= 4
  const any4 = tokens.find(t => t.length >= 4);
  if (any4) return any4;
  return tokens[0] ?? null;
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
}

function scoreMatch(
  queryTokens: string[],
  queryCardNum: string | null,
  requiredCategory: string | null,
  card: DbCard
): number {
  // Category filter
  if (requiredCategory && card.category !== requiredCategory) return -1;

  let score = 0;

  // Card number match in normalized_name — very high weight
  if (queryCardNum) {
    const numLower = queryCardNum.toLowerCase();
    if (card.normalized_name.includes(numLower)) {
      score += 60;
    } else {
      // Partial: just the numeric portion without the slash/dash
      const numOnly = numLower.replace(/[^0-9]/g, '');
      if (numOnly.length >= 3 && card.normalized_name.replace(/[^0-9]/g, '').includes(numOnly)) {
        score += 20;
      }
    }
  }

  // Token overlap on normalized_name
  const nameTokens = new Set(card.normalized_name.split(/\s+/));
  for (const t of queryTokens) {
    if (!GENERIC_TOKENS.has(t) && nameTokens.has(t)) score += 5;
  }

  return score;
}

// ── Supabase query ───────────────────────────────────────────────────────────

async function queryCards(
  normalized: string,
  cardNum: string | null,
  category: string | null,
  supabaseUrl: string,
  serviceKey: string
): Promise<DbCard[]> {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const catFilter = category ? `&category=eq.${encodeURIComponent(category)}` : '';
  const select = 'select=id,category,product_name,console_name,normalized_name,loose_price,graded_price';

  // Primary: match on card number (most precise)
  if (cardNum) {
    const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(cardNum.toLowerCase())}*&${select}${catFilter}&limit=20`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const rows: DbCard[] = await res.json();
      if (rows.length > 0) return rows;
    }
  }

  // Fallback: match on most specific token (skip generic words like "pokemon")
  const tokens = tokenize(normalized);
  const mainToken = pickMainToken(tokens);
  if (!mainToken) return [];

  const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(mainToken)}*&${select}${catFilter}&limit=60`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  return await res.json() as DbCard[];
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function readCache(key: string, supabaseUrl: string, serviceKey: string): Promise<Record<string, unknown> | null> {
  const url = `${supabaseUrl}/rest/v1/pricecharting_cache?normalized_query=eq.${encodeURIComponent(key)}&select=result,cached_at&limit=1`;
  const res = await fetch(url, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (Date.now() - new Date(rows[0].cached_at).getTime() > CACHE_TTL_MS) return null;
  return rows[0].result as Record<string, unknown>;
}

async function writeCache(key: string, result: unknown, supabaseUrl: string, serviceKey: string): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/pricecharting_cache`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ normalized_query: key, result, cached_at: new Date().toISOString() }),
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase env vars missing');

    const normalized = normalizeTitle(sourceTitle);
    const cacheKey = `csv2:${category ?? 'auto'}:${normalized}`;

    // Cache hit?
    const cached = await readCache(cacheKey, supabaseUrl, serviceKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cardNum = extractCardNumber(sourceTitle);
    const queryTokens = tokenize(normalized);

    // Detect category from title if not provided
    const detectedCategory = category
      ?? (sourceTitle.toLowerCase().match(/\b(op|one.?piece)\b/) ? 'onepiece' : 'pokemon');

    const candidates = await queryCards(normalized, cardNum, detectedCategory, supabaseUrl, serviceKey);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ status: 'no_match' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Score and rank
    const scored = candidates
      .map(c => ({ card: c, score: scoreMatch(queryTokens, cardNum, detectedCategory, c) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    // Lower minimum threshold — 5 points = 1 strong token match (e.g. character name)
    if (scored.length === 0 || scored[0].score < 5) {
      return new Response(JSON.stringify({ status: 'no_match' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const best = scored[0];
    const confidence: 'high' | 'medium' | 'low' =
      best.score >= 60 ? 'high' : best.score >= 25 ? 'medium' : 'low';

    const rawMarketValue = best.card.loose_price ?? null;
    const psa10MarketValue = best.card.graded_price ?? null;

    const estimatedProfit =
      psa10MarketValue !== null
        ? Math.round((psa10MarketValue - (rawMarketValue ?? 0) - GRADING_COST) * 100) / 100
        : null;

    const roiPercent =
      estimatedProfit !== null && rawMarketValue !== null && rawMarketValue > 0
        ? Math.round((estimatedProfit / rawMarketValue) * 100)
        : null;

    const result = {
      status: 'success',
      matchConfidence: confidence,
      matchedProductName: best.card.product_name,
      consoleName: best.card.console_name || undefined,
      rawMarketValue,
      psa10MarketValue,
      estimatedProfit,
      roiPercent,
      priceSource: 'pricecharting' as const,
    };

    writeCache(cacheKey, result, supabaseUrl, serviceKey).catch(() => {});

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
