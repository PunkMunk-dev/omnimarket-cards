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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { cardTitle, playerName, year, brand } = await req.json();
    if (!cardTitle && !playerName) throw new Error('cardTitle or playerName is required');

    const token = await getOAuthToken();
    let query = cardTitle || '';
    if (playerName) {
      const parts = [playerName];
      if (year) parts.push(year);
      if (brand) parts.push(brand);
      query = parts.join(' ');
    }
    query = `${query} PSA 10`;

    const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
    url.searchParams.set('q', query);
    url.searchParams.set('category_ids', '213');
    url.searchParams.set('limit', '25');
    url.searchParams.set('sort', 'price');
    url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}');

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, marketValue: null, activeListings: [], listingCount: 0, error: `API error: ${response.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const data = await response.json();
    const items = data.itemSummaries || [];
    const psa10Items = items.filter((item: any) => {
      const title = (item.title || '').toLowerCase();
      const hasPsa = title.includes('psa');
      const has10 = title.includes('10') || title.includes('gem mint');
      const hasLowerGrade = /psa\s*[1-9](?!\d)/.test(title) && !title.includes('psa 10');
      return hasPsa && has10 && !hasLowerGrade;
    });

    const activeListings = psa10Items
      .filter((item: any) => item.price?.value)
      .map((item: any) => ({
        price: parseFloat(item.price.value),
        title: item.title,
        ebayUrl: item.itemWebUrl,
        imageUrl: item.thumbnailImages?.[0]?.imageUrl || item.image?.imageUrl || null,
      }))
      .sort((a: any, b: any) => a.price - b.price);

    const marketValue = activeListings.length > 0 ? activeListings[0].price : null;

    return new Response(JSON.stringify({ success: true, marketValue, activeListings: activeListings.slice(0, 10), listingCount: activeListings.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, marketValue: null, activeListings: [], listingCount: 0, error: err instanceof Error ? err.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  }
});
