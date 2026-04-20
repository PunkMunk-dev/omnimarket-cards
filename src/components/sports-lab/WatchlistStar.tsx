import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSportsWatchlist } from '@/contexts/SportsWatchlistContext';
import type { EbayListing } from '@/types/sportsEbay';

export function WatchlistStar({ listing }: { listing: EbayListing }) {
  const { isWatched, toggleWatchlist } = useSportsWatchlist();
  const watched = isWatched(listing.itemId);

  return (
    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatchlist(listing); }}
      className={cn("p-1 rounded-full transition-all duration-200 hover:scale-110 bg-black/50 backdrop-blur-sm")}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}>
      <Star className={cn("h-4 w-4 transition-colors duration-200", watched ? "text-yellow-500 fill-current" : "text-white/60 hover:text-white/90")} strokeWidth={2} />
    </button>
  );
}
