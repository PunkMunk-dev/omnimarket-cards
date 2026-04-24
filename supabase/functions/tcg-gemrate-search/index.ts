import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMRATE_BASE = 'https://foaaw4f13g.execute-api.us-east-1.amazonaws.com/v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape of each item returned by GemRate /item_search. */
interface GemRateApiItem {
  gemrate_id?: string;
  item_description?: string;
  grader?: string;
  total_grades?: number;
  search_score?: number;
  [key: string]: unknown;
}

/** Internal normalized shape returned to the frontend. */
interface NormalizedResult {
  found: boolean;
  gemrateId: string | null;
  matchedName: string | null;
  totalGrades: number | null;
  searchScore: number | null;
  confidence: 'high' | 'medium' | 'low';
  source: 'gemrate';
}

const NOT_FOUND: NormalizedResult = {
  found: false,
  gemrateId: null,
  matchedName: null,
  totalGrades: null,
  searchScore: null,
  confidence: 'low',
  source: 'gemrate',
};

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * GemRate /item_search may return either a bare array or a wrapped object.
 * Handle both defensively rather than assuming a single shape.
 */
function extractItems(data: unknown): GemRateApiItem[] {
  if (Array.isArray(data)) return data as GemRateApiItem[];
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.results)) return d.results as GemRateApiItem[];
    if (Array.isArray(d.items))   return d.items   as GemRateApiItem[];
    if (Array.isArray(d.data))    return d.data    as GemRateApiItem[];
  }
  return [];
}

/**
 * Selection logic:
 *  1. Prefer PSA-graded items over any other grader.
 *  2. Within that pool, rank by search_score desc, then total_grades desc.
 */
function selectBestItem(items: GemRateApiItem[]): GemRateApiItem | null {
  if (!items.length) return null;
  const psaItems = items.filter(i => (i.grader ?? '').toLowerCase() === 'psa');
  const pool = psaItems.length > 0 ? psaItems : items;
  return [...pool].sort((a, b) => {
    const sd = (b.search_score ?? 0) - (a.search_score ?? 0);
    if (sd !== 0) return sd;
    return (b.total_grades ?? 0) - (a.total_grades ?? 0);
  })[0] ?? null;
}

function computeConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score > 190) return 'high';
  if (score > 170) return 'medium';
  return 'low';
}

function normalizeItem(item: GemRateApiItem): NormalizedResult {
  const searchScore = typeof item.search_score === 'number' ? item.search_score : null;
  return {
    found: true,
    gemrateId: item.gemrate_id   ?? null,
    matchedName: item.item_description ?? null,
    totalGrades: typeof item.total_grades === 'number' ? item.total_grades : null,
    searchScore,
    confidence: searchScore !== null ? computeConfidence(searchScore) : 'low',
    source: 'gemrate',
  };
}

// ── GemRate API call ──────────────────────────────────────────────────────────

async function callGemRateApi(query: string, apiKey: string): Promise<NormalizedResult> {
  const response = await fetch(`${GEMRATE_BASE}/item_search`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    // Log status only — never log the key
    console.error(`GemRate API returned ${response.status} for query length ${query.length}`);
    return NOT_FOUND;
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    console.error('GemRate API: failed to parse JSON response');
    return NOT_FOUND;
  }

  const items = extractItems(raw);
  const best  = selectBestItem(items);
  if (!best) return NOT_FOUND;
  return normalizeItem(best);
}

// ── Cache ─────────────────────────────────────────────────────────────────────

async function readCache(
  cacheKey: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<NormalizedResult | null> {
  const url =
    `${supabaseUrl}/rest/v1/tcg_gemrate_search_cache` +
    `?cache_key=eq.${encodeURIComponent(cacheKey)}&select=response,cached_at&limit=1`;

  const res = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  if (!res.ok) return null;
  const rows = await res.json() as Array<{ response: NormalizedResult; cached_at: string }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const ageMs = Date.now() - new Date(rows[0].cached_at).getTime();
  if (ageMs > CACHE_TTL_MS) return null;

  return rows[0].response;
}

async function writeCache(
  cacheKey: string,
  normalizedName: string,
  category: string,
  result: NormalizedResult,
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/tcg_gemrate_search_cache`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      cache_key: cacheKey,
      normalized_name: normalizedName,
      category,
      response: result,
      cached_at: new Date().toISOString(),
    }),
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      product_name?: string;
      normalized_name?: string;
      category?: string;
    };

    const { product_name, normalized_name, category } = body;
    if (!product_name) {
      return new Response(JSON.stringify({ error: 'product_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMRATE_API_KEY');
    if (!apiKey) {
      console.error('GEMRATE_API_KEY secret is not set');
      return new Response(JSON.stringify(NOT_FOUND), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL');
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase env vars missing');

    // Prefer normalized_name for matching accuracy; fall back to product_name
    const queryName = (normalized_name || product_name).trim();
    const cat       = (category || 'pokemon').toLowerCase();
    const cacheKey  = `${cat}:${queryName.toLowerCase()}`;

    // Cache read
    const cached = await readCache(cacheKey, supabaseUrl, serviceKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GemRate API call
    const result = await callGemRateApi(queryName, apiKey);

    // Write to cache — fire and forget, never block the response
    writeCache(cacheKey, queryName, cat, result, supabaseUrl, serviceKey).catch((e) => {
      console.error('Cache write failed:', e instanceof Error ? e.message : e);
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    // Always return 200 with NOT_FOUND — never break card rendering
    console.error('tcg-gemrate-search error:', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify(NOT_FOUND), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
