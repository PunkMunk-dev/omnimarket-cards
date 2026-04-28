import { useState, useMemo, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TerminalGrid } from './TerminalGrid';
import { ResultsToolbar, PRICE_RANGES, type PriceRange, type ListingTypeFilter } from './ResultsToolbar';
import { searchActiveListings } from '@/services/tcgEbayService';
import { filterTcgListings, dedupeTcgListings, titleQualityScore } from '@/lib/tcgFilters';
import type { TcgTarget, TcgSet, Game, SearchFilters } from '@/types/tcg';
import type { ProcessedListing } from '@/types/tcgFilters';

const BEST_CANDIDATE_EXCLUDE_RE = /\b(psa|bgs|sgc|cgc|graded|slab|proxy|custom|sealed|booster|box|tin|lot|bundle|bulk|repack)\b/i;

function pickBestCandidateId(listings: ProcessedListing[]): string | null {
  const eligible = listings
    .map((listing) => ({
      listing,
      price: Number.parseFloat(listing.price.value),
      titleMatch: titleQualityScore(listing) > 0,
    }))
    .filter(({ listing, price }) => (
      Number.isFinite(price) &&
      price > 0 &&
      listing.listingType === 'FIXED_PRICE' &&
      listing.imageQualityScore >= 0.7 &&
      !!listing.image &&
      !BEST_CANDIDATE_EXCLUDE_RE.test(listing.title)
    ));

  if (eligible.length === 0) return null;

  const lowestPrice = Math.min(...eligible.map(({ price }) => price));
  const priceWindow = Math.max(lowestPrice * 1.15, lowestPrice + 15);
  const shortlist = eligible.filter(({ price }) => price <= priceWindow);

  if (shortlist.length === 0) return null;

  const ranked = shortlist
    .map(({ listing, price, titleMatch }) => ({
      listing,
      price,
      titleMatch,
      score:
        (titleMatch ? 4 : 0) +
        (listing.cardNumber ? 1 : 0) +
        listing.imageQualityScore * 2 +
        Math.min(listing.watchCount ?? 0, 10) * 0.05 -
        ((price - lowestPrice) / Math.max(lowestPrice, 1)) * 2,
    }))
    .sort((a, b) => b.score - a.score || a.price - b.price);

  const best = ranked[0];
  if (!best) return null;
  if (!best.titleMatch && best.listing.imageQualityScore < 0.9) return null;
  if (best.score < 4.5) return null;
  return best.listing.itemId;
}

interface TerminalViewProps {
  target?: TcgTarget;
  game: Game;
  freeQuery?: string;
  selectedSetId: string | null;
  sets: TcgSet[];
  onTotalCountChange: (count: number) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function TerminalView({ target, game, freeQuery, selectedSetId, sets, onTotalCountChange, onLoadingChange }: TerminalViewProps) {
  const [sort, setSort] = useState<SearchFilters['sort']>('best_match');
  const [listingType, setListingType] = useState<ListingTypeFilter>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');

  const priceRangeConfig = PRICE_RANGES.find(r => r.value === priceRange) ?? PRICE_RANGES[0];

  const buildSearchQuery = (): string => {
    if (freeQuery) return freeQuery;
    const parts = [target!.name];
    if (selectedSetId) {
      const set = sets.find(s => s.id === selectedSetId);
      if (set) parts.push(set.set_name);
    }
    return parts.join(' ');
  };

  const activeQuery = buildSearchQuery();

  const buyingOptions = listingType === 'auction' ? 'AUCTION' : listingType === 'buy_now' ? 'FIXED_PRICE' : undefined;
  const isAuctionMode = listingType === 'auction';

  const filters: SearchFilters = {
    sort,
    excludeLots: true,
    excludeSealed: true,
    rawOnly: true,
    minPrice: isAuctionMode ? 0 : Math.max(10, priceRangeConfig.min),
    maxPrice: isAuctionMode ? 0 : priceRangeConfig.max,
    cardType: 'single',
    buyingOptions,
  };

  const {
    data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['terminal-listings', 'tcg', game, activeQuery, filters, listingType],
    queryFn: ({ pageParam = 0 }) => searchActiveListings(activeQuery, filters, 100, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
    enabled: !!activeQuery,
    retry: 1,
    staleTime: 60_000,
  });

  const allListings = useMemo(() => {
    if (!data) return undefined;
    return data.pages.flatMap(p => p.listings);
  }, [data]);

  const totalFromApi = data?.pages[0]?.total ?? 0;

  useEffect(() => { onLoadingChange(isLoading); }, [isLoading, onLoadingChange]);
  useEffect(() => { onTotalCountChange(allListings?.length ?? 0); }, [allListings, onTotalCountChange]);

  const processedResults = useMemo(() => {
    if (!allListings) return undefined;
    const filterOptions = { game, cardType: 'single' as const, hideDamaged: true, hideBlurry: true, dedupeEnabled: true, cardNumber: '', rarity: 'any' as const };
    const { passed, removedCount } = filterTcgListings(allListings, filterOptions);
    const result = dedupeTcgListings(passed);
    let final = result.deduped;
    if (sort === 'best_match' && !isAuctionMode) {
      final = [...final].sort((a, b) => {
        // Primary: eBay watch count (higher = more buyer interest)
        const watchDiff = (b.watchCount ?? 0) - (a.watchCount ?? 0);
        if (watchDiff !== 0) return watchDiff;
        // Secondary: title quality (card number present → more likely to enrich)
        return titleQualityScore(b) - titleQualityScore(a);
      });
    }
    return { listings: final, removedCount, dupsRemoved: result.duplicatesRemoved };
  }, [allListings, game, sort, isAuctionMode]);

  const bestCandidateId = useMemo(
    () => processedResults?.listings ? pickBestCandidateId(processedResults.listings) : null,
    [processedResults?.listings],
  );

  const displayTitle = activeQuery;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--om-text-0)' }}>
          Live listings for <span style={{ color: 'var(--om-accent)' }}>{displayTitle}</span>
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>
          Find the best card to grade PSA 10.
        </p>
      </div>

      <ResultsToolbar
        resultCount={processedResults?.listings.length ?? 0}
        totalCount={totalFromApi}
        listingType={listingType}
        onListingTypeChange={(type) => {
          setListingType(type);
          setSort(type === 'auction' ? 'ending_soonest' : 'best_match');
        }}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        sortOption={sort}
        onSortChange={setSort}
        filteredOutCount={processedResults?.removedCount}
      />

      <TerminalGrid
        listings={processedResults?.listings}
        isLoading={isLoading}
        error={error}
        hasMore={!!hasNextPage}
        isLoadingMore={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        game={game}
        bestCandidateId={bestCandidateId}
      />
    </div>
  );
}
