import { supabase } from '@/integrations/supabase/client';
import type { EbayListing, DemandMetrics, SearchFilters } from '@/types/tcg';

const LOT_TERMS = [
  'lot', 'bundle', 'bulk', 'collection', 'set of', 'x2', 'x3', 'x4', 'x5', 'x10',
  'playset', 'complete set', 'mixed', 'random', 'mystery', 'grab bag', 'pick'
];
const SEALED_TERMS = [
  'sealed', 'booster', 'box', 'case', 'pack', 'etb', 'elite trainer',
  'blister', 'tin', 'display', 'build battle', 'starter deck'
];
const GRADED_TERMS = [
  'psa', 'bgs', 'sgc', 'cgc', 'graded', 'gem mint', 'slab', 'beckett', 'ace', 'mnt'
];

function buildExcludeTerms(filters: SearchFilters): string[] {
  const terms: string[] = [];
  if (filters.excludeLots) terms.push(...LOT_TERMS);
  if (filters.excludeSealed) terms.push(...SEALED_TERMS);
  if (filters.rawOnly) terms.push(...GRADED_TERMS);
  return terms;
}

function filterListings(listings: EbayListing[], filters: SearchFilters): EbayListing[] {
  const excludeTerms = buildExcludeTerms(filters);
  
  return listings.filter(listing => {
    const titleLower = listing.title.toLowerCase();
    const matchesExclude = excludeTerms.some(term => titleLower.includes(term.toLowerCase()));
    if (matchesExclude) return false;
    if (listing.condition && listing.condition.toLowerCase() === 'graded') return false;
    const price = parseFloat(listing.price.value);
    if (filters.minPrice > 0 && price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
    return true;
  });
}

function sortListings(listings: EbayListing[], sort: SearchFilters['sort']): EbayListing[] {
  switch (sort) {
    case 'price_low':
      return [...listings].sort((a, b) => parseFloat(a.price.value) - parseFloat(b.price.value));
    case 'price_high':
      return [...listings].sort((a, b) => parseFloat(b.price.value) - parseFloat(a.price.value));
    default:
      return listings;
  }
}

export interface PaginatedListings {
  listings: EbayListing[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export async function searchActiveListings(
  query: string,
  filters: SearchFilters,
  limit: number = 100,
  offset: number = 0
): Promise<PaginatedListings> {
  const { data, error } = await supabase.functions.invoke('tcg-ebay-search', {
    body: {
      action: 'active',
      query,
      limit,
      offset,
      sort: filters.sort,
      cardType: filters.cardType || 'single',
      minPrice: filters.minPrice || 0,
      maxPrice: filters.maxPrice || 0,
      buyingOptions: filters.buyingOptions,
    },
  });

  if (error) throw error;

  const items: EbayListing[] = data?.items || data || [];
  const total: number = data?.total ?? items.length;
  const hasMore: boolean = data?.hasMore ?? false;

  const filtered = filterListings(items, filters);
  const sorted = sortListings(filtered, filters.sort);

  return {
    listings: sorted,
    total,
    hasMore,
    nextOffset: offset + limit,
  };
}

export async function searchSoldListingsLast7Days(
  query: string,
  limit: number = 10
): Promise<DemandMetrics> {
  const { data, error } = await supabase.functions.invoke('tcg-ebay-search', {
    body: { action: 'sold', query, limit },
  });

  if (error) throw error;

  const { soldItems, metrics } = data;

  return {
    salesLast7Days: metrics?.salesLast7Days || 0,
    mostRecentSale: metrics?.mostRecentSale || null,
    medianSoldPrice: metrics?.medianSoldPrice || '0.00',
    recentSales: soldItems || [],
    isProxy: false,
  };
}
