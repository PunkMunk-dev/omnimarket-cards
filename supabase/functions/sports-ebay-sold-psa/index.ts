import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Psa10SoldComp { price: number; soldDate: string | null; ebayUrl: string; title: string; }

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return values.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
}

function calculateWeightedMedian(comps: Psa10SoldComp[]): number {
  if (comps.length === 0) return 0;
  if (comps.length === 1) return comps[0].price;
  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const weightedPrices = comps.map(comp => {
    const compDate = comp.soldDate ? new Date(comp.soldDate).getTime() : now - oneWeekMs * 2;
    const weight = Math.max(0.1, Math.exp(-(now - compDate) / oneWeekMs));
    return { price: comp.price, weight };
  });
  const totalWeight = weightedPrices.reduce((s, wp) => s + wp.weight, 0);
  return weightedPrices.reduce((s, wp) => s + wp.price * wp.weight, 0) / totalWeight;
}

async function searchPsa10Sold(appId: string, params: { playerName: string; brand?: string; year?: string }) {
  const queryParts = [params.playerName, 'PSA 10'];
  if (params.brand) queryParts.push(params.brand);
  if (params.year) queryParts.push(params.year);
  queryParts.push('card');

  const url = new URL('https://svcs.ebay.com/services/search/FindingService/v1');
  url.searchParams.set('OPERATION-NAME', 'findCompletedItems');
  url.searchParams.set('SERVICE-VERSION', '1.0.0');
  url.searchParams.set('SECURITY-APPNAME', appId);
  url.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON');
  url.searchParams.set('REST-PAYLOAD', '');
  url.searchParams.set('keywords', queryParts.join(' '));
  url.searchParams.set('categoryId', '212');
  url.searchParams.set('paginationInput.entriesPerPage', '25');
  url.searchParams.set('sortOrder', 'EndTimeSoonest');
  url.searchParams.set('itemFilter(0).name', 'SoldItemsOnly');
  url.searchParams.set('itemFilter(0).value', 'true');

  const empty = { marketValue: null, marketValueConfidence: null, soldComps: [], soldCount: 0, avgPrice: null, lastSoldDate: null };

  try {
    const response = await fetch(url.toString(), { headers: { 'X-EBAY-SOA-SECURITY-APPNAME': appId } });
    if (!response.ok) return empty;

    const data = await response.json();
    const searchResult = data.findCompletedItemsResponse?.[0];
    if (searchResult?.ack?.[0] !== 'Success') return empty;

    const items = searchResult?.searchResult?.[0]?.item || [];
    const psa10Items = items.filter((item: any) => {
      const title = (item.title?.[0] || '').toLowerCase();
      const sellingState = item.sellingStatus?.[0]?.sellingState?.[0];
      return (title.includes('psa 10') || title.includes('psa10') || title.includes('gem mint'))
        && sellingState === 'EndedWithSales';
    });

    if (psa10Items.length === 0) return empty;

    const soldComps: Psa10SoldComp[] = psa10Items
      .map((item: any) => {
        const price = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ? parseFloat(item.sellingStatus[0].currentPrice[0].__value__) : null;
        if (!price || price <= 0) return null;
        return { price, soldDate: item.listingInfo?.[0]?.endTime?.[0] || null, ebayUrl: item.viewItemURL?.[0] || '', title: item.title?.[0] || '' };
      })
      .filter(Boolean) as Psa10SoldComp[];

    if (soldComps.length === 0) return empty;

    const prices = soldComps.map(c => c.price);
    let marketValue: number;
    let marketValueConfidence: 'high' | 'medium' | 'low';

    if (soldComps.length >= 3) {
      const clean = removeOutliers(prices);
      const cleanComps = soldComps.filter(c => clean.includes(c.price));
      marketValue = calculateWeightedMedian(cleanComps.length > 0 ? cleanComps : soldComps);
      marketValueConfidence = 'high';
    } else if (soldComps.length === 2) {
      marketValue = calculateMedian(prices);
      marketValueConfidence = 'medium';
    } else {
      marketValue = prices[0];
      marketValueConfidence = 'low';
    }

    marketValue = Math.round(marketValue * 100) / 100;
    const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
    const dates = soldComps.map(c => c.soldDate).filter(Boolean).sort().reverse();

    return { marketValue, marketValueConfidence, soldComps, soldCount: soldComps.length, avgPrice, lastSoldDate: dates[0] || null };
  } catch {
    return empty;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const EBAY_CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID');
    if (!EBAY_CLIENT_ID) throw new Error('EBAY_CLIENT_ID is not configured');

    const { playerName, brand, year } = await req.json();
    if (!playerName) throw new Error('playerName is required');

    const result = await searchPsa10Sold(EBAY_CLIENT_ID, { playerName, brand, year });
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', marketValue: null, marketValueConfidence: null, soldComps: [], soldCount: 0, avgPrice: null, lastSoldDate: null }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
