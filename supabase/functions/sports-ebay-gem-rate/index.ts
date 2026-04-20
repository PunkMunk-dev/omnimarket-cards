import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TokenCache { accessToken: string; expiresAt: number; }
let oauthTokenCache: TokenCache | null = null;

async function getOAuthToken(): Promise<string> {
  if (oauthTokenCache && Date.now() < oauthTokenCache.expiresAt - 5 * 60 * 1000) return oauthTokenCache.accessToken;
  const clientId = Deno.env.get('EBAY_CLIENT_ID');
  const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('eBay credentials not configured');
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

async function lookupGemRate(params: { playerName: string; year?: string; brand?: string; traits?: string[] }) {
  const token = await getOAuthToken();
  const queryParts = [params.playerName];
  if (params.year) queryParts.push(params.year);
  if (params.brand) queryParts.push(params.brand);
  if (params.traits?.length) queryParts.push(...params.traits);
  queryParts.push('PSA 10');

  const searchUrl = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  searchUrl.searchParams.set('q', queryParts.join(' '));
  searchUrl.searchParams.set('category_ids', '213');
  searchUrl.searchParams.set('limit', '5');
  searchUrl.searchParams.set('sort', 'price');
  searchUrl.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}');

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', 'Content-Type': 'application/json' },
  });

  const empty = { success: true, gemRate: null, psa10Pop: null, totalPsaPop: null, psa10Url: null };
  if (!searchResponse.ok) {
    if (searchResponse.status === 429) return { ...empty, success: false, error: 'Rate limit exceeded' };
    throw new Error(`eBay search error: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const items = searchData.itemSummaries || [];
  const psa10Items = items.filter((item: any) => {
    const title = (item.title || '').toLowerCase();
    const hasPsa = title.includes('psa');
    const has10 = title.includes('10') || title.includes('gem mint');
    const hasLowerGrade = /psa\s*[1-9](?!\d)/.test(title) && !title.includes('psa 10');
    return hasPsa && has10 && !hasLowerGrade;
  });

  if (psa10Items.length === 0) return empty;

  const bestMatch = psa10Items[0];
  const psa10Url = bestMatch.itemWebUrl;
  const itemUrl = `https://api.ebay.com/buy/browse/v1/item/${bestMatch.itemId}`;

  const itemResponse = await fetch(itemUrl, {
    headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', 'Content-Type': 'application/json' },
  });

  if (!itemResponse.ok) return { ...empty, psa10Url };

  const itemData = await itemResponse.json();
  const localizedAspects = itemData.localizedAspects || [];

  let psa10Pop: number | null = null;
  let totalPsaPop: number | null = null;

  for (const aspect of localizedAspects) {
    const name = (aspect.name || '').toLowerCase();
    const value = aspect.value || '';
    if ((name.includes('psa 10') || name.includes('psa10')) && name.includes('pop')) {
      const parsed = parseInt(value.replace(/,/g, ''), 10);
      if (!isNaN(parsed)) psa10Pop = parsed;
    }
    if ((name.includes('total') && name.includes('pop')) || name.includes('population')) {
      const parsed = parseInt(value.replace(/,/g, ''), 10);
      if (!isNaN(parsed) && !name.includes('psa 10')) totalPsaPop = parsed;
    }
  }

  let gemRate: number | null = null;
  if (psa10Pop !== null && totalPsaPop !== null && totalPsaPop > 0) {
    gemRate = Math.round((psa10Pop / totalPsaPop) * 1000) / 10;
  }

  return { success: true, gemRate, psa10Pop, totalPsaPop, psa10Url };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { playerName, year, brand, traits } = await req.json();
    if (!playerName) throw new Error('playerName is required');
    const result = await lookupGemRate({ playerName, year, brand, traits });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, gemRate: null, psa10Pop: null, totalPsaPop: null, psa10Url: null, error: err instanceof Error ? err.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  }
});
