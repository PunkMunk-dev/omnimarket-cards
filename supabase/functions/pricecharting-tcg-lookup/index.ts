import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRADING_COST = 25; // USD

// ── Normalization ────────────────────────────────────────────────────────────

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    // Strip grader + grade: "PSA 10", "BGS 9.5", "CGC 8"
    .replace(/\b(psa|bgs|cgc|sgc|beckett)\s*\d+(\.\d+)?\b/g, '')
    // Strip noise words
    .replace(/\b(mint|near\s*mint|nm-m|nm|lp|mp|hp|poor|graded|raw|ungraded|lot|wow|rare|holo\s*rare)\b/g, '')
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
    }
  }

  // Token overlap on normalized_name
  const nameTokens = new Set(card.normalized_name.split(/\s+/));
  for (const t of queryTokens) {
    if (nameTokens.has(t)) score += 5;
  }

  return score;
}

// ── Supabase query ───────────────────────────────────────────────────────────

async function queryCards(
  normalized: string,
  cardNum: string | null,
  supabaseUrl: string,
  serviceKey: string
): Promise<DbCard[]> {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Primary: match on card number (most precise)
  if (cardNum) {
    const numQuery = cardNum.toLowerCase().replace(/#/g, '%23');
    const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(cardNum.toLowerCase())}*&select=id,category,product_name,console_name,normalized_name,loose_price,graded_price&limit=20`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const rows: DbCard[] = await res.json();
      if (rows.length > 0) return rows;
    }
    void numQuery; // used above
  }

  // Fallback: match on first significant token
  const tokens = tokenize(normalized);
  const mainToken = tokens.find(t => t.length >= 4) ?? tokens[0];
  if (!mainToken) return [];

  const url = `${supabaseUrl}/rest/v1/pricecharting_tcg_cards?normalized_name=ilike.*${encodeURIComponent(mainToken)}*&select=id,category,product_name,console_name,normalized_name,loose_price,graded_price&limit=40`;
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
    const cacheKey = `csv:${normalized}`;

    // Cache hit?
    const cached = await readCache(cacheKey, supabaseUrl, serviceKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cardNum = extractCardNumber(sourceTitle);
    const queryTokens = tokenize(normalized);

    // Detect category from title if not provided
    const detectedCategory = category
      ?? (sourceTitle.toLowerCase().match(/\b(op|one piece)\b/) ? 'onepiece' : 'pokemon');

    const candidates = await queryCards(normalized, cardNum, supabaseUrl, serviceKey);

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

    if (scored.length === 0 || scored[0].score < 15) {
      return new Response(JSON.stringify({ status: 'no_match' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const best = scored[0];
    const confidence: 'high' | 'medium' | 'low' =
      best.score >= 60 ? 'high' : best.score >= 30 ? 'medium' : 'low';

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
