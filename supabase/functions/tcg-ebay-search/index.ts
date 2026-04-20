import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const appId = Deno.env.get('EBAY_CLIENT_ID');
  const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');

  if (!appId || !clientSecret) {
    throw new Error('eBay credentials not configured');
  }

  const credentials = btoa(`${appId}:${clientSecret}`);
  
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token error:', errorText);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}

const BASE_EXCLUSIONS = ['lot', 'bundle', 'bulk', 'collection', 'playset'];
const SEALED_EXCLUSIONS = ['sealed', 'booster', 'box', 'case', 'pack', 'etb', 'elite trainer', 'blister', 'tin', 'display', 'build battle', 'starter deck'];
const GRADED_EXCLUSIONS = ['psa', 'bgs', 'sgc', 'cgc', 'graded', 'slab', 'beckett', 'ace', 'mnt'];
const TCG_JUNK_EXCLUSIONS = ['you pick', 'choose', 'pick', 'random', 'mystery', 'replica', 'proxy', 'custom', 'fanmade', 'digital', 'code', 'online', 'playmat', 'deckbox', 'sleeves', 'toploader', 'binder', 'break', 'breaks', 'repack'];

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

function buildExclusions(cardType: string): string[] {
  const exclusions = [...BASE_EXCLUSIONS, ...TCG_JUNK_EXCLUSIONS];
  if (cardType === 'single') {
    exclusions.push(...SEALED_EXCLUSIONS, ...GRADED_EXCLUSIONS);
  } else if (cardType === 'slabbed') {
    exclusions.push(...SEALED_EXCLUSIONS);
  } else if (cardType === 'sealed' || cardType === 'packs') {
    exclusions.push(...GRADED_EXCLUSIONS);
  } else {
    exclusions.push(...SEALED_EXCLUSIONS, ...GRADED_EXCLUSIONS);
  }
  return exclusions;
}

function getTimeRemaining(endDate: string): string {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

async function searchActiveListings(query: string, limit = 100, sort = 'best_match', cardType = 'single', minPrice = 0, maxPrice = 0, buyingOptions = 'ALL', offset = 0) {
  const token = await getAccessToken();

  // Strip decorative terms for broader eBay results
  const { simplified, decorativeFound } = simplifyQuery(query);
  const searchQuery = simplified || query;
  
  const sortMap: Record<string, string> = {
    price_low: 'price',
    price_high: '-price',
    best_match: 'bestMatch',
    newly_listed: 'newlyListed',
    ending_soonest: 'endingSoonest',
  };
  const ebaySort = sortMap[sort] || 'bestMatch';
  
  const exclusions = buildExclusions(cardType);
  const exclusionString = exclusions.map(term => term.includes(' ') ? `-"${term}"` : `-${term}`).join(' ');

  let intentSuffix = 'card';
  if (cardType === 'slabbed') intentSuffix = 'graded card';
  else if (cardType === 'sealed') intentSuffix = 'sealed';
  else if (cardType === 'packs') intentSuffix = 'pack';

  const fullQuery = `${searchQuery} ${intentSuffix} ${exclusionString}`;
  
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', fullQuery);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('category_ids', '183454');

  const filterParts: string[] = [];
  if (buyingOptions === 'AUCTION') {
    filterParts.push('buyingOptions:{AUCTION}');
  } else if (buyingOptions === 'FIXED_PRICE' || sort === 'price_low' || sort === 'price_high') {
    filterParts.push('buyingOptions:{FIXED_PRICE}');
  } else {
    filterParts.push('buyingOptions:{FIXED_PRICE|AUCTION}');
  }
  
  if (minPrice > 0 || maxPrice > 0) {
    const low = minPrice > 0 ? minPrice.toString() : '';
    const high = maxPrice > 0 ? maxPrice.toString() : '';
    filterParts.push(`price:[${low}..${high}]`);
    filterParts.push('priceCurrency:USD');
  }
  
  url.searchParams.set('filter', filterParts.join(','));
  url.searchParams.set('sort', ebaySort);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Search error:', errorText);
    throw new Error(`eBay search failed: ${response.status}`);
  }

  const data = await response.json();
  const total = data.total || 0;
  const items = (data.itemSummaries || []).map((item: any) => ({
    itemId: item.itemId,
    title: item.title,
    price: {
      value: (item.currentBidPrice?.value && item.currentBidPrice.value !== '0.00')
        ? item.currentBidPrice.value
        : (item.price?.value || '0.00'),
      currency: item.currentBidPrice?.currency || item.price?.currency || 'USD',
    },
    bidCount: item.bidCount || 0,
    image: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '',
    condition: item.condition || 'Unknown',
    listingType: item.buyingOptions?.includes('AUCTION') ? 'AUCTION' : 'FIXED_PRICE',
    itemWebUrl: item.itemWebUrl,
    shipping: {
      cost: item.shippingOptions?.[0]?.shippingCost?.value || '0.00',
      type: item.shippingOptions?.[0]?.shippingCostType === 'FREE' ? 'Free Shipping' : 'Standard Shipping',
    },
    timeRemaining: item.itemEndDate ? getTimeRemaining(item.itemEndDate) : undefined,
    watchCount: item.watchCount || 0,
  }));

  // Boost results containing decorative terms to the top
  if (decorativeFound.length > 0) {
    items.sort((a: any, b: any) => {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();
      const scoreA = decorativeFound.filter((t: string) => titleA.includes(t)).length;
      const scoreB = decorativeFound.filter((t: string) => titleB.includes(t)).length;
      return scoreB - scoreA;
    });
  }

  const hasMore = (offset + items.length) < total;
  return { items, total, offset, hasMore };
}

async function searchSoldListings(query: string, limit = 10) {
  const token = await getAccessToken();
  const appId = Deno.env.get('EBAY_CLIENT_ID');
  
  const findingUrl = new URL('https://svcs.ebay.com/services/search/FindingService/v1');
  findingUrl.searchParams.set('OPERATION-NAME', 'findCompletedItems');
  findingUrl.searchParams.set('SERVICE-VERSION', '1.0.0');
  findingUrl.searchParams.set('SECURITY-APPNAME', appId!);
  findingUrl.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON');
  findingUrl.searchParams.set('REST-PAYLOAD', '');
  findingUrl.searchParams.set('keywords', query);
  findingUrl.searchParams.set('categoryId', '183454');
  findingUrl.searchParams.set('paginationInput.entriesPerPage', limit.toString());
  findingUrl.searchParams.set('sortOrder', 'EndTimeSoonest');
  findingUrl.searchParams.set('itemFilter(0).name', 'SoldItemsOnly');
  findingUrl.searchParams.set('itemFilter(0).value', 'true');
  
  const response = await fetch(findingUrl.toString());
  
  if (!response.ok) {
    return { soldItems: [], metrics: null };
  }

  const data = await response.json();
  const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
  const items = searchResult?.item || [];
  
  const soldItems = items.map((item: any) => ({
    itemId: item.itemId?.[0] || '',
    title: item.title?.[0] || '',
    soldPrice: {
      value: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0.00',
      currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
    },
    soldDate: item.listingInfo?.[0]?.endTime?.[0] || new Date().toISOString(),
    image: item.galleryURL?.[0] || '',
    itemWebUrl: item.viewItemURL?.[0] || '',
  }));

  const prices = soldItems.map((item: any) => parseFloat(item.soldPrice.value)).filter((p: number) => p > 0);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianIndex = Math.floor(sortedPrices.length / 2);
  const medianPrice = sortedPrices.length > 0
    ? sortedPrices.length % 2 === 0
      ? ((sortedPrices[medianIndex - 1] + sortedPrices[medianIndex]) / 2).toFixed(2)
      : sortedPrices[medianIndex].toFixed(2)
    : '0.00';

  const sortedByDate = [...soldItems].sort((a: any, b: any) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime());

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSales = soldItems.filter((item: any) => new Date(item.soldDate).getTime() > sevenDaysAgo);

  return {
    soldItems: sortedByDate,
    metrics: {
      salesLast7Days: recentSales.length,
      mostRecentSale: sortedByDate[0]?.soldDate || null,
      medianSoldPrice: medianPrice,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, limit, sort, cardType, minPrice, maxPrice, buyingOptions, offset } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    if (action === 'active') {
      result = await searchActiveListings(query, limit || 100, sort || 'best_match', cardType || 'single', minPrice || 0, maxPrice || 0, buyingOptions || 'ALL', offset || 0);
    } else if (action === 'sold') {
      result = await searchSoldListings(query, limit || 10);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "active" or "sold"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
