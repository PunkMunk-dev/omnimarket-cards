import React from 'react';
import { TerminalCard } from './TerminalCard';
import { PackageX, Loader2 } from 'lucide-react';
import { ResultsSkeletonGrid } from './ResultsSkeletonGrid';
import { Button } from '@/components/ui/button';
import type { EbayListing, Game } from '@/types/tcg';
import type { ProcessedListing } from '@/types/tcgFilters';

interface TerminalGridProps {
  listings: (EbayListing | ProcessedListing)[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  game?: Game;
}

export const TerminalGrid = React.forwardRef<HTMLDivElement, TerminalGridProps>(
  ({ listings, isLoading, error, hasMore, isLoadingMore, onLoadMore, game }, ref) => {
    if (isLoading) return <ResultsSkeletonGrid />;

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <PackageX className="h-8 w-8 mb-3" style={{ color: 'var(--om-text-3)' }} />
          <p className="text-xs" style={{ color: 'var(--om-text-2)' }}>Failed to load listings</p>
        </div>
      );
    }

    if (!listings || listings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageX className="h-8 w-8 mb-3" style={{ color: 'var(--om-text-3)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--om-text-2)' }}>No cards found for this search.</p>
          <p className="text-xs" style={{ color: 'var(--om-text-3)' }}>Try adjusting your filters or selecting a different set.</p>
        </div>
      );
    }

    return (
      <div ref={ref}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {listings.map((listing) => (
            <TerminalCard key={listing.itemId} listing={listing} game={game} />
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="om-btn text-xs font-mono border-white/10 hover:border-white/20"
              style={{ background: 'var(--om-bg-2)', color: 'var(--om-text-1)' }}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

TerminalGrid.displayName = 'TerminalGrid';
