import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchRequest {
  query: string;
  page?: number;
  limit?: number;
  sort?: 'best' | 'price_asc' | 'graded' | 'raw' | 'auction_only' | 'buy_now_only';
  includeLots?: boolean;
  buyingOptions?: 'ALL' | 'AUCTION' | 'FIXED_PRICE';
}

interface EbayItem {
  itemId: string;
  title: string;
  price: { value: string; currency: string };
  shipping?: { value: string; currency: string };
  condition: string;
  buyingOption: 'AUCTION' | 'FIXED_PRICE' | 'UNKNOWN';
  endDate?: string;
  imageUrl?: string;
  additionalImages?: string[];  // For multi-image grading (front + back)
  itemUrl?: string;
  seller?: string;
  popData?: {
    psa10: number | null;
    total: number | null;
    gemRate: number | null;
    source: 'listing';
  };
}

/**
 * Extract PSA population data from listing title and description
 * Sellers often include: "POP 5", "PSA 10 Pop 12", "Low Pop 3", "Population: 15"
 */
/**
 * Extract PSA population data from listing title and description
 * Sellers often include: "POP 5", "Pop 5/100", "PSA 10 Pop 12", "Low Pop 3", "Population 5 of 100"
 */
function extractPopulationFromListing(
  title: string, 
  shortDescription?: string
): { psa10: number | null; total: number | null } | null {
  const text = `${title} ${shortDescription || ''}`;
  
  // PRIORITY 1: Patterns that capture BOTH psa10 and total (most specific first)
  const twoValuePatterns = [
    // "PSA 10 Pop 4, Total Pop 6" or "PSA 10 Pop: 4 Total Pop: 6"
    /PSA\s*10\s+Pop[:\s]*(\d{1,5})[,\s]+Total\s+Pop[:\s]*(\d{1,6})/i,
    // "Pop 4, Total 6" or "Pop 4 / Total 6"
    /\bPOP[:\s]*(\d{1,5})[,\s\/]+Total[:\s]*(\d{1,6})\b/i,
    // "Pop 4 out of 6"
    /\bPOP[:\s]*(\d{1,5})\s+out\s+of\s+(\d{1,6})\b/i,
    // "Pop 5/100" or "Pop: 5/100" or "POP 5 / 100"
    /\bPOP[:\s]*(\d{1,5})\s*[\/]\s*(\d{1,6})\b/i,
    // "Pop 5 of 100" or "POP 5 OF 100"
    /\bPOP[:\s]*(\d{1,5})\s+of\s+(\d{1,6})\b/i,
    // "PSA 10 Pop 5/100" or "PSA10 Pop: 3/50"
    /PSA\s*10\s+Pop[:\s]*(\d{1,5})\s*[\/]\s*(\d{1,6})/i,
    // "PSA 10 Pop 5 of 100"
    /PSA\s*10\s+Pop[:\s]*(\d{1,5})\s+of\s+(\d{1,6})/i,
    // "Population 5/100" or "Population: 8/200"
    /Population[:\s]*(\d{1,5})\s*[\/]\s*(\d{1,6})/i,
    // "Population 5 of 100"
    /Population[:\s]*(\d{1,5})\s+of\s+(\d{1,6})/i,
    // "Pop Count 5/100" or "Pop Count: 12/150"
    /Pop\s+Count[:\s]*(\d{1,5})\s*[\/]\s*(\d{1,6})/i,
    // "Pop 5 (100 total)" or "POP 5 (100 Total)"
    /\bPOP[:\s]*(\d{1,5})\s*\(\s*(\d{1,6})\s*total\s*\)/i,
    // "PSA Pop 5 (120 total)"
    /PSA\s+Pop[:\s]*(\d{1,5})\s*\(\s*(\d{1,6})\s*total\s*\)/i,
  ];

  // Try two-value patterns first
  for (const pattern of twoValuePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[2]) {
      const psa10 = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      // Sanity checks
      if (psa10 > 0 && psa10 < 50000 && total > 0 && total < 500000 && psa10 <= total) {
        return { psa10, total };
      }
    }
  }
  
  // PRIORITY 2: Single-value patterns (existing logic)
  const singleValuePatterns = [
    // "PSA 10 Pop 5" or "PSA10 Pop: 12"
    /PSA\s*10\s+Pop[:\s]*(\d{1,5})/i,
    // "Pop Count: 8" or "Pop Count 12"
    /Pop\s+Count[:\s]*(\d{1,5})/i,
    // "Low Pop 3" or "Low Pop: 5"
    /Low\s+Pop[:\s]*(\d{1,5})/i,
    // "Population: 15" or "Population 8"
    /Population[:\s]*(\d{1,5})/i,
    // "POP 5" or "Pop: 5" or "Pop 12"
    /\bPOP[:\s]*(\d{1,5})\b/i,
  ];

  for (const pattern of singleValuePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const count = parseInt(match[1], 10);
      if (count > 0 && count < 50000) {
        return { psa10: count, total: null };
      }
    }
  }

  return null;
}

/**
 * Transform eBay image URL to high-resolution version (Phase 2)
 */
function getHighResImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url
    .replace(/s-l\d+\./, 's-l1600.')
    .replace(/s-l\d+_/, 's-l1600_');
}

const JUNK_KEYWORDS = [
  'box', 'boxes', 'case', 'cases', 'break', 'breaker', 'breakers',
  'lot', 'lots', 'pack', 'packs', 'sealed', 'hobby box',
  'blaster', 'mega', 'complete set', 'set break', 'random', 
  'mystery', 'repack', 'bundle', 'collection', 'bulk', 'mixer',
  'wax', 'cello', 'rack', 'jumbo', 'fat pack', 'hanger'
];

function extractCoreTerm(query: string): string {
  // Remove year patterns, card numbers, special characters
  // Keep the main subject (usually player/character name)
  const cleaned = query
    .replace(/\d{4}/g, '')  // Remove years
    .replace(/#\d+/g, '')   // Remove card numbers
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .split(/\s+/)
    .filter(term => term.length > 2)
    .slice(0, 2)  // Keep first 2 meaningful words (likely the name)
    .join(' ');
  
  return cleaned.trim() || query;
}

const GRADED_KEYWORDS = ['psa', 'bgs', 'sgc', 'cgc', 'beckett', 'graded', 'ccic', 'ace', 'mnt', 'tag', 'cga', 'ags', 'hga'];

function isGradedItem(title: string, condition?: string): boolean {
  const lowerCondition = (condition || '').toLowerCase();
  if (lowerCondition.includes('graded')) return true;
  const lowerTitle = title.toLowerCase();
  return GRADED_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

function isJunkTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return JUNK_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerTitle);
  });
}

// Short terms that are critical for card identification
const TCG_SHORT_TERMS = new Set(['v', 'gx', 'ex', 'sp', 'sr', 'ar', 'ur', 'fa', 'sa', 'sv', 'op']);

const DECORATIVE_TERMS = [
  'manga art', 'alternate art', 'alt art', 'full art',
  'illustration rare', 'special art rare', 'secret rare',
  'textured rare', 'gold rare', 'art rare',
  'premium rare', 'hyper rare', 'rainbow rare',
  'character rare', 'super rare',
  'parallel rare', 'leader card', 'promo',
  'tournament pack', 'stamped', 'reverse holo',
];

function simplifyQuery(query: string): { simplified: string; decorativeFound: string[] } {
  let simplified = query;
  const decorativeFound: string[] = [];
  for (const term of DECORATIVE_TERMS) {
    const regex = new RegExp(term, 'gi');
    if (regex.test(simplified)) {
      decorativeFound.push(term.toLowerCase());
      simplified = simplified.replace(regex, '').trim();
    }
  }
  simplified = simplified.replace(/\s{2,}/g, ' ').trim();
  return { simplified, decorativeFound };
}

const COMPOUND_TERMS: Record<string, string> = {
  'one piece': 'onepiece',
  'dragon ball': 'dragonball',
  'magic the gathering': 'magicthegathering',
  'yu gi oh': 'yugioh',
  'yu-gi-oh': 'yugioh',
};

function collapseCompoundTerms(text: string): string {
  let result = text;
  for (const [phrase, token] of Object.entries(COMPOUND_TERMS)) {
    result = result.replace(new RegExp(phrase, 'gi'), token);
  }
  return result;
}

function extractKeyTerms(query: string): string[] {
  let normalized = query.toLowerCase().replace(/[#\-]/g, ' ');
  normalized = collapseCompoundTerms(normalized);

  const stopWords = ['the', 'a', 'an', 'and', 'or', 'of', 'in', 'for', 'to', 'with'];
  return normalized
    .split(/\s+/)
    .filter(term => {
      if (term.length === 0) return false;
      if (stopWords.includes(term)) return false;
      if (term.length <= 1) return TCG_SHORT_TERMS.has(term);
      return true;
    });
}

function titleMatchesQuery(title: string, keyTerms: string[]): boolean {
  if (keyTerms.length === 0) return true;
  const lowerTitle = collapseCompoundTerms(title.toLowerCase());
  
  // Separate terms into name terms (likely player name) and other terms
  const nameLikeTerms = keyTerms.filter(term => 
    term.length > 2 && !/^\d+$/.test(term) // Not a number
  );
  const otherTerms = keyTerms.filter(term => 
    term.length <= 2 || /^\d+$/.test(term)
  );
  
  // Require at least 60% of name-like terms to match
  const nameMatchCount = nameLikeTerms.filter(term => lowerTitle.includes(term)).length;
  const nameMatchRatio = nameLikeTerms.length === 0 ? 1 : nameMatchCount / nameLikeTerms.length;
  const nameTermsMatch = nameMatchRatio >= 0.60;
  
  // At least 50% of other terms (numbers, short words) should match
  const otherMatchCount = otherTerms.filter(term => lowerTitle.includes(term)).length;
  const otherTermsMatch = otherTerms.length === 0 || otherMatchCount >= Math.ceil(otherTerms.length * 0.5);
  
  return nameTermsMatch && otherTermsMatch;
}

function getSortParam(_sort: string): string {
  return 'bestMatch';
}

async function getEbayToken(): Promise<string> {
  const clientId = Deno.env.get('EBAY_CLIENT_ID');
  const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
  const oauthBase = Deno.env.get('EBAY_OAUTH_BASE') || 'https://api.ebay.com';

  if (!clientId || !clientSecret) {
    throw new Error('Missing eBay API credentials');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${oauthBase}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('eBay OAuth error:', errorText);
    throw new Error(`Failed to get eBay token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function searchEbay(
  token: string,
  query: string,
  limit: number,
  offset: number,
  sort: string,
  buyingOptions?: 'AUCTION' | 'FIXED_PRICE'
): Promise<{ items: any[]; total: number }> {
  const browseBase = Deno.env.get('EBAY_BROWSE_BASE') || 'https://api.ebay.com';
  const marketplaceId = Deno.env.get('EBAY_MARKETPLACE_ID') || 'EBAY_US';

  // Append junk exclusions to the query so eBay filters them server-side
  const exclusions = '-lot -bundle -bulk -sealed -booster -pack -case -repack -mystery -wax -cello -blaster';
  const enrichedQuery = `${query} ${exclusions}`;

  const params = new URLSearchParams({
    q: enrichedQuery,
    limit: limit.toString(),
    offset: offset.toString(),
    sort: sort,
  });

  if (buyingOptions) {
    params.set('filter', `buyingOptions:{${buyingOptions}}`);
  }

  const url = `${browseBase}/buy/browse/v1/item_summary/search?${params}`;
  
  console.log('Searching eBay:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('eBay Browse API error:', errorText);
    throw new Error(`eBay search failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    items: data.itemSummaries || [],
    total: data.total || 0,
  };
}

function normalizeItem(item: any): EbayItem {
  const buyingOptions = item.buyingOptions || [];
  let buyingOption: 'AUCTION' | 'FIXED_PRICE' | 'UNKNOWN' = 'UNKNOWN';
  
  if (buyingOptions.includes('AUCTION')) {
    buyingOption = 'AUCTION';
  } else if (buyingOptions.includes('FIXED_PRICE')) {
    buyingOption = 'FIXED_PRICE';
  }

  const price = item.price || {};
  const shippingCost = item.shippingOptions?.[0]?.shippingCost;
  
  // Get primary image and convert to high-res (Phase 2)
  const primaryImageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl;
  
  // Extract additional images for multi-image grading (Phase 1)
  const additionalImages: string[] = [];
  if (item.additionalImages && Array.isArray(item.additionalImages)) {
    for (const img of item.additionalImages.slice(0, 3)) { // Limit to 3 additional images
      const imgUrl = img.imageUrl || img;
      if (typeof imgUrl === 'string') {
        additionalImages.push(getHighResImageUrl(imgUrl) || imgUrl);
      }
    }
  }

  // Extract population data from listing title and description
  const popExtracted = extractPopulationFromListing(
    item.title, 
    item.shortDescription
  );
  
  let popData: EbayItem['popData'] = undefined;
  if (popExtracted && popExtracted.psa10 !== null) {
    // Calculate gem rate if we have both values
    let gemRate: number | null = null;
    if (popExtracted.total !== null && popExtracted.total > 0) {
      gemRate = Math.round((popExtracted.psa10 / popExtracted.total) * 100);
    }
    
    popData = {
      psa10: popExtracted.psa10,
      total: popExtracted.total,
      gemRate: gemRate,
      source: 'listing' as const,
    };
  }

  return {
    itemId: item.itemId,
    title: item.title,
    price: {
      value: price.value || '0',
      currency: price.currency || 'USD',
    },
    shipping: shippingCost ? {
      value: shippingCost.value || '0',
      currency: shippingCost.currency || 'USD',
    } : undefined,
    condition: item.condition || 'Unknown',
    buyingOption,
    endDate: item.itemEndDate,
    imageUrl: getHighResImageUrl(primaryImageUrl),
    additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
    itemUrl: item.itemWebUrl,
    seller: item.seller?.username,
    popData,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SearchRequest = await req.json();
    const {
      query,
      page = 1,
      limit = 24,
      sort = 'best',
      includeLots = false,
      buyingOptions = 'ALL',
    } = body;

    if (!query || query.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clampedLimit = Math.min(Math.max(limit, 1), 50);
    
    // Request more items to compensate for client-side filtering
    const requestLimit = Math.min(clampedLimit * 3, 150);
    
    // IMPORTANT: eBay requires offset to be a multiple of limit
    // So we must calculate offset using requestLimit, not clampedLimit
    const offset = (page - 1) * requestLimit;

    const token = await getEbayToken();
    const sortParam = getSortParam(sort);
    const apiBuyingOptions = buyingOptions !== 'ALL' ? buyingOptions : undefined;

    // Simplify query for eBay API (strip decorative terms)
    const { simplified, decorativeFound } = simplifyQuery(query);
    const searchQuery = simplified || query;

    const { items: rawItems, total } = await searchEbay(token, searchQuery, requestLimit, offset, sortParam, apiBuyingOptions);

    let normalizedItems = rawItems.map(normalizeItem);

    // For title matching, use simplified query (don't penalize missing decorative terms)
    const keyTerms = extractKeyTerms(simplified || query);
    normalizedItems = normalizedItems.filter(item => 
      titleMatchesQuery(item.title, keyTerms)
    );

    // ALWAYS filter out junk titles (boxes, lots, packs, etc.) - no exceptions
    normalizedItems = normalizedItems.filter(item => !isJunkTitle(item.title));

    // Apply buying options filter
    if (buyingOptions !== 'ALL') {
      normalizedItems = normalizedItems.filter(item => item.buyingOption === buyingOptions);
    }

    // Filter graded vs raw cards based on sort option
    if (sort === 'graded') {
      // Show only graded cards when "Graded" sort is selected
      normalizedItems = normalizedItems.filter(item => isGradedItem(item.title, item.condition));
      
      // Fallback: if no graded cards found for exact query, search for similar graded cards
      if (normalizedItems.length === 0) {
        const fallbackQuery = extractCoreTerm(query) + ' graded';
        console.log('No graded cards found, trying fallback query:', fallbackQuery);
        
        const { items: fallbackRaw } = await searchEbay(token, fallbackQuery, clampedLimit, 0, 'bestMatch');
        let fallbackItems = fallbackRaw.map(normalizeItem);
        
        // Apply same filters to fallback results
        fallbackItems = fallbackItems.filter(item => !isJunkTitle(item.title));
        fallbackItems = fallbackItems.filter(item => isGradedItem(item.title, item.condition));
        
        // Apply buying options filter to fallback results
        if (buyingOptions !== 'ALL') {
          fallbackItems = fallbackItems.filter(item => item.buyingOption === buyingOptions);
        }
        
        normalizedItems = fallbackItems;
      }
    } else if (sort === 'raw') {
      // Show only ungraded/raw cards
      normalizedItems = normalizedItems.filter(item => !isGradedItem(item.title, item.condition));
    } else if (sort === 'auction_only' || sort === 'buy_now_only' || sort === 'price_asc') {
      // Show ALL cards (both graded and raw) - filtering is done by buyingOptions only
  }
    
    // Boost results containing decorative terms to the top
    if (decorativeFound.length > 0) {
      normalizedItems.sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        const scoreA = decorativeFound.filter(t => titleA.includes(t)).length;
        const scoreB = decorativeFound.filter(t => titleB.includes(t)).length;
        return scoreB - scoreA;
      });
    }

    // Re-sort by price after filtering to ensure correct order (overrides decorative boost)
    if (sort === 'price_asc') {
      normalizedItems.sort((a, b) => {
        const priceA = parseFloat(a.price.value);
        const priceB = parseFloat(b.price.value);
        return priceA - priceB;
      });
    }
    
    // Limit results to the originally requested amount after all filtering
    normalizedItems = normalizedItems.slice(0, clampedLimit);

    const hasMore = offset + rawItems.length < total;

    return new Response(
      JSON.stringify({
        query,
        page,
        limit: clampedLimit,
        total,
        nextPage: hasMore ? page + 1 : null,
        items: normalizedItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
