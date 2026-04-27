import { useQueries } from '@tanstack/react-query';
import { searchActiveListings } from '@/services/tcgEbayService';
import type { TopRoiCard } from './useTopRoi';
import type { EbayListing } from '@/types/tcg';

// ── Match validation helpers ──────────────────────────────────────────────────

/**
 * Extracts a structured card number from a PriceCharting product_name.
 * Handles two formats:
 *   Pokémon  — "#74/172", "215/264" (card number / set size)
 *   One Piece — "OP01-001", "EB01-006", "ST12-003" (set code + dash + card number)
 * Returns the normalized lowercase token, or null if none found.
 */
function extractCardNumber(productName: string): string | null {
  const lower = productName.toLowerCase();
  // Pokémon: optional # then X/Y (1–3 digits slash 1–3 digits)
  const pokeMatch = lower.match(/#?(\d{1,3}\/\d{1,3})/);
  if (pokeMatch) return pokeMatch[1];
  // TCG with alpha-numeric set codes: AB01-001
  const setMatch = lower.match(/\b([a-z]{2}\d{2}-\d{3})\b/);
  if (setMatch) return setMatch[1];
  return null;
}

/**
 * Returns the first token from a product name that:
 *   - has more than 2 characters
 *   - is not purely numeric
 *   - contains at least one letter
 * This is the "core name" signal used to reject unrelated listings.
 */
function firstNameToken(productName: string): string | null {
  return (
    productName.toLowerCase().split(/\s+/).find(
      t => t.length > 2 && /[a-z]/.test(t) && !/^\d+$/.test(t),
    ) ?? null
  );
}

/**
 * Returns true when the eBay listing title plausibly corresponds to the card.
 *
 * If a card number is present in product_name:
 *   Require both the core name token AND the card number to appear in the title.
 *   This eliminates wrong-variant matches (e.g. a different Charizard card number).
 *
 * If no card number is present:
 *   Require only the core name token.
 */
function listingMatchesCard(listing: EbayListing, card: TopRoiCard): boolean {
  const title = (listing.title ?? '').toLowerCase();
  if (!title) return false;

  const cardNumber = extractCardNumber(card.product_name);
  const nameToken  = firstNameToken(card.product_name);
  const hasCoreMatch = nameToken ? title.includes(nameToken) : true;

  if (cardNumber) {
    return hasCoreMatch && title.includes(cardNumber);
  }
  return hasCoreMatch;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

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
            // Lower bound: 25% of raw est. — prevents suspiciously cheap mismatches
            // (damaged cards, wrong variants) from inflating computed profit
            minPrice: Math.max(5, Math.floor(card.loose_price * 0.25)),
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
    const listing = query.data.find(l => listingMatchesCard(l, card));
    if (!listing) return;
    const listingPrice = parseFloat(listing.price.value);
    if (isNaN(listingPrice) || listingPrice <= 0) return;
    const actualProfit = Math.round((card.graded_price - listingPrice - 25) * 100) / 100;
    if (actualProfit <= 0) return;
    results.push({ card, listing, listingPrice, actualProfit });
  });

  return { results, isLoading };
}
