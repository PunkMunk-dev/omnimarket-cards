import { useQueries } from '@tanstack/react-query';
import { searchActiveListings } from '@/services/tcgEbayService';
import type { TopRoiCard } from './useTopRoi';
import type { EbayListing } from '@/types/tcg';

export interface LiveBuyResult {
  card: TopRoiCard;
  listing: EbayListing;
  listingPrice: number;
  /** graded_price - listingPrice - $25 grading cost */
  actualProfit: number;
}

/**
 * For each of the top N cards (by opportunityScore), searches eBay for active
 * BIN raw listings priced at or below the PriceCharting raw benchmark (+ 15%
 * buffer). Returns only results where the cheapest listing still yields a
 * positive profit after grading cost.
 */
export function useLiveBuyListings(topCards: TopRoiCard[], count = 3): {
  results: LiveBuyResult[];
  isLoading: boolean;
} {
  const cards = topCards.slice(0, count);

  const queries = useQueries({
    queries: cards.map(card => ({
      queryKey: ['live-buy', card.id],
      queryFn: async (): Promise<EbayListing[]> => {
        const result = await searchActiveListings(
          card.product_name,
          {
            sort: 'price_low',
            excludeLots: true,
            excludeSealed: true,
            rawOnly: true,
            minPrice: 0,
            maxPrice: Math.floor(card.loose_price * 1.15),
            cardType: 'single',
            buyingOptions: 'FIXED_PRICE',
          },
          10,
          0,
        );
        return result.listings;
      },
      staleTime: 2 * 60_000,
      retry: 0,
    })),
  });

  const isLoading = queries.some(q => q.isLoading);

  const results: LiveBuyResult[] = [];
  queries.forEach((query, i) => {
    if (!query.data || query.data.length === 0) return;
    const card = cards[i];
    const listing = query.data[0]; // cheapest BIN listing
    const listingPrice = parseFloat(listing.price.value);
    if (isNaN(listingPrice) || listingPrice <= 0) return;
    const actualProfit = Math.round((card.graded_price - listingPrice - 25) * 100) / 100;
    if (actualProfit <= 0) return;
    results.push({ card, listing, listingPrice, actualProfit });
  });

  return { results, isLoading };
}
