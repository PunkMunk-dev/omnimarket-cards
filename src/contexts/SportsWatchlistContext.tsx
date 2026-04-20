import type { EbayListing } from '@/types/sportsEbay';
import type { WatchlistItem } from '@/types/ebay';
import { useSharedWatchlist } from '@/contexts/WatchlistContext';
import { sportsListingToEbayItem } from '@/lib/watchlistAdapters';

export type { WatchlistItem };

export function useSportsWatchlist() {
  const shared = useSharedWatchlist();

  return {
    watchlist: shared.watchlist,
    isWatched: shared.isInWatchlist,
    toggleWatchlist: (listing: EbayListing) => {
      const item = sportsListingToEbayItem(listing);
      const wasWatched = shared.isInWatchlist(listing.itemId);
      shared.toggleWatchlist(item);
      return !wasWatched;
    },
    removeFromWatchlist: shared.removeFromWatchlist,
    clearWatchlist: shared.clearWatchlist,
    count: shared.count,
  };
}
