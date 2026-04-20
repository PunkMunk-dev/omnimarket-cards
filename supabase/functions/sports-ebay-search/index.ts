import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== IN-MEMORY CACHE ==========
interface CacheEntry {
  data: any[];
  timestamp: number;
  hasMore: boolean;
  nextOffset?: number;
  totalResults?: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

// ========== OAUTH TOKEN CACHE ==========
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let oauthTokenCache: TokenCache | null = null;

function getCacheKey(params: EbaySearchParams): string {
  return JSON.stringify({
    playerName: params.playerName?.toLowerCase().trim(),
    brand: params.brand?.toLowerCase().trim(),
    traits: params.traits?.map(t => t.toLowerCase().trim()).sort(),
    year: params.year,
    offset: params.offset,
  });
}

function getFromCache(key: string): CacheEntry | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry;
}

function setCache(
  key: string, data: any[],
  hasMore: boolean, nextOffset?: number, totalResults?: number
): void {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, timestamp: Date.now(), hasMore, nextOffset, totalResults });
}

// ========== FILTERING LOGIC ==========
const GRADED_KEYWORDS = [
  'psa', 'bgs', 'sgc', 'cgc', 'bccg', 'gma', 'hga', 'csg', 'ksa', 'mnt',
  'graded', 'slab', 'slabbed', 'gem mint', 'gem-mint', 'authenticated'
];

const EXCLUDE_PHRASES = [
  'card lot', 'team lot', 'player lot', 'pick your card', 'you pick', 'choose your',
  'complete set', 'complete team set', 'complete your set', 'base set', 'full set',
  'set break', 'team set', 'blaster box', 'hobby box', 'retail box', 'sealed box',
  'factory sealed', 'mega box', 'booster box', 'booster pack', 'cello pack', 'fat pack',
  'hanger box', 'hanger pack', 'gravity feed', 'chaser pack', 'chaser packs',
  'value pack', 'jumbo pack', 'rack pack', 'wax box', 'wax pack', 'starter kit',
  'case break', 'case hit', 'case hits', 'gem mint', 'gem-mint', 'sealed pack',
  'retail pack', 'sealed retail', 'price guide', 'beckett baseball', 'beckett football',
  'beckett basketball', 'beckett hockey', 'beckett annual', 'uncut sheet',
];

const EXCLUDE_WORDS = [
  'lot', 'lots', 'bundle', 'bundles', 'bulk', 'repack', 'repacks', 'mystery',
  'pack', 'packs', 'tin', 'sealed', 'sticker', 'stickers', 'wrapper', 'wrappers',
  'poster', 'magazine', 'bobblehead', 'figurine', 'beckett', 'coin', 'token',
  'reprint', 'reprints', 'custom', 'novelty', 'digital', 'nft',
];

const EXCLUDE_WORD_PATTERNS = EXCLUDE_WORDS.map(w => new RegExp(`\\b${w}\\b`, 'i'));

const EXCLUDED_SELLERS = [
  'comc', 'dcsports87', 'probstein123', '5starsportscards', 'burbank', 'tull068',
  'messarichshippingservices', 'pcsportscards', 'quickconsignment',
  '5starcardsgradingconsignments', 'cardcollector2', 'jaytee1424', 'ljscardshop',
  'mcsportscards', 'tntsportscards',
];

const EXCLUDED_BRANDS = ['score', 'flawless', 'leaf', 'bowman u', 'bowman university'];

function normalizeSeller(seller: string | null | undefined): string {
  if (!seller) return '';
  return seller.toLowerCase().replace(/[\s_\-]/g, '');
}

function isExcludedSeller(seller: string | null | undefined): boolean {
  if (!seller || seller.trim() === '') return false;
  return EXCLUDED_SELLERS.includes(normalizeSeller(seller));
}

function isGradedCard(title: string): boolean {
  const l = title.toLowerCase();
  return GRADED_KEYWORDS.some(k => l.includes(k));
}

function isExcludedItem(title: string): boolean {
  const l = title.toLowerCase();
  if (EXCLUDE_PHRASES.some(p => l.includes(p))) return true;
  if (EXCLUDE_WORD_PATTERNS.some(r => r.test(l))) return true;
  return false;
}

function isExcludedBrand(title: string): boolean {
  const l = title.toLowerCase();
  return EXCLUDED_BRANDS.some(b => l.includes(b));
}

function titleContainsPlayerName(title: string, playerName: string): boolean {
  const lt = title.toLowerCase();
  const lp = playerName.toLowerCase().trim();
  const parts = lp.split(/\s+/).filter(p => p.length > 1);
  if (parts.length === 0) return false;
  if (lt.includes(lp)) return true;
  const lastName = parts[parts.length - 1];
  if (!lt.includes(lastName)) return false;
  if (parts.length === 1) return true;
  const firstName = parts[0];
  if (lt.includes(firstName)) return true;
  const initialRegex = new RegExp(`\\b${firstName[0]}[.\\s\\-]`, 'i');
  return initialRegex.test(title);
}

function titleContainsAllTerms(title: string, searchQuery: string): boolean {
  const lt = title.toLowerCase();
  const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return false;
  return terms.every(t => lt.includes(t));
}

interface EbaySearchParams {
  playerName: string;
  brand?: string;
  traits?: string[];
  year?: string;
  freeFormSearch?: boolean;
  offset?: number;
}

interface PaginationResult {
  listings: any[];
  hasMore: boolean;
  nextOffset?: number;
  totalResults?: number;
}

class RateLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'RateLimitError'; }
}

// ========== OAUTH TOKEN MANAGEMENT ==========
async function getOAuthToken(): Promise<string> {
  if (oauthTokenCache && Date.now() < oauthTokenCache.expiresAt - 5 * 60 * 1000) {
    return oauthTokenCache.accessToken;
  }
  const clientId = Deno.env.get('EBAY_CLIENT_ID');
  const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('EBAY_CLIENT_ID or EBAY_CLIENT_SECRET not configured');

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${credentials}` },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });
  if (!response.ok) throw new Error(`Failed to get OAuth token: ${response.status}`);
  const data = await response.json();
  oauthTokenCache = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in * 1000) };
  return data.access_token;
}

// ========== BROWSE API SEARCH ==========
async function searchEbayBrowseApi(params: EbaySearchParams): Promise<PaginationResult> {
  const token = await getOAuthToken();
  const queryParts = [params.playerName];
  if (params.year) queryParts.push(params.year);
  if (params.brand) queryParts.push(params.brand);
  if (params.traits?.length) queryParts.push(...params.traits);
  queryParts.push('card');
  const query = queryParts.join(' ');
  const limit = 100;
  const offset = params.offset ?? 0;

  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', query);
  url.searchParams.set('category_ids', '212');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE|AUCTION}');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 429) throw new RateLimitError('eBay Browse API rate limit exceeded');
    throw new Error(`eBay Browse API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data.itemSummaries || [];
  const total = data.total ?? 0;

  const filteredItems = items.filter((item: any) => {
    const title = item.title || '';
    const seller = item.seller?.username;
    if (params.freeFormSearch) { if (!titleContainsAllTerms(title, params.playerName)) return false; }
    else { if (!titleContainsPlayerName(title, params.playerName)) return false; }
    if (isGradedCard(title)) return false;
    if (isExcludedItem(title)) return false;
    if (isExcludedSeller(seller)) return false;
    if (isExcludedBrand(title)) return false;
    const conditionId = item.conditionId;
    if (conditionId && String(conditionId).startsWith('2750')) return false;
    const conditionText = item.condition || '';
    const lc = conditionText.toLowerCase();
    if (lc.includes('graded') && !lc.includes('ungraded')) return false;
    return true;
  });

  const nextOffset = offset + items.length;
  const hasMore = nextOffset < total && items.length === limit;

  const listings = filteredItems.map((item: any) => {
    let imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl;
    if (imageUrl) imageUrl = imageUrl.replace(/\/s-l\d+\./i, '/s-l1600.').replace(/\/s-l\d+$/i, '/s-l1600');
    let imageQualityScore = 0;
    if (imageUrl) {
      if (imageUrl.includes('/s-l1600')) imageQualityScore += 5;
      else if (imageUrl.includes('/s-l800') || imageUrl.includes('/s-l500')) imageQualityScore += 2;
      if (imageUrl.includes('thumbs.ebaystatic.com') || imageUrl.includes('placeholder')) imageQualityScore -= 10;
    } else imageQualityScore = -10;
    const additionalImageCount = item.additionalImages?.length || 0;
    if (additionalImageCount >= 2) imageQualityScore += 4;
    else if (additionalImageCount >= 1) imageQualityScore += 2;

    return {
      itemId: item.itemId, title: item.title,
      price: item.price?.value ? parseFloat(item.price.value) : null,
      currency: item.price?.currency || 'USD', imageUrl,
      itemWebUrl: item.itemWebUrl, condition: item.condition,
      seller: item.seller?.username,
      shippingCost: item.shippingOptions?.[0]?.shippingCost?.value ? parseFloat(item.shippingOptions[0].shippingCost.value) : null,
      buyingOptions: item.buyingOptions || [],
      listingDate: item.itemCreationDate,
      itemEndDate: item.itemEndDate || null,
      currentBidPrice: item.currentBidPrice?.value ? parseFloat(item.currentBidPrice.value) : null,
      bidCount: item.bidCount ?? null,
      imageQualityScore, additionalImageCount,
    };
  });

  return { listings, hasMore, nextOffset: hasMore ? nextOffset : undefined, totalResults: total };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { playerName, brand, traits, year, offset, freeFormSearch } = await req.json();
    if (!playerName) throw new Error('playerName is required');

    const searchParams: EbaySearchParams = { playerName, brand, traits, year, freeFormSearch, offset };

    const cacheKey = getCacheKey(searchParams);
    const cachedEntry = getFromCache(cacheKey);
    if (cachedEntry) {
      return new Response(JSON.stringify({
        success: true, listings: cachedEntry.data, count: cachedEntry.data.length, cached: true,
        hasMore: cachedEntry.hasMore, nextOffset: cachedEntry.nextOffset,
        totalResults: cachedEntry.totalResults,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = await searchEbayBrowseApi(searchParams);

    setCache(cacheKey, result.listings, result.hasMore, result.nextOffset, result.totalResults);

    return new Response(JSON.stringify({
      success: true, listings: result.listings, count: result.listings.length, cached: false,
      hasMore: result.hasMore, nextOffset: result.nextOffset,
      totalResults: result.totalResults,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ success: false, error: error.message, listings: [], retryAfter: 60 }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', listings: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
