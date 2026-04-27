import { useState, useMemo, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { TerminalGrid } from './TerminalGrid';
import { ResultsToolbar, PRICE_RANGES, type PriceRange, type ListingTypeFilter } from './ResultsToolbar';
import { searchActiveListings } from '@/services/tcgEbayService';
import { filterTcgListings, dedupeTcgListings, titleQualityScore } from '@/lib/tcgFilters';
import type { TcgTarget, TcgSet, Game, SearchFilters } from '@/types/tcg';
import { Input } from '@/components/ui/input';

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [listingType, setListingType] = useState<ListingTypeFilter>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const priceRangeConfig = PRICE_RANGES.find(r => r.value === priceRange) ?? PRICE_RANGES[0];

  const buildSearchQuery = (): string => {
    if (freeQuery) return freeQuery;
    const parts = [target!.name];
    if (debouncedSearch.trim()) parts.push(debouncedSearch.trim());
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

  const displayTitle = freeQuery ?? target?.name ?? activeQuery;

  return (
    <div className="space-y-4">
      {/* Header: Live listings for [query] */}
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--om-text-0)' }}>
          Live listings for <span style={{ color: 'var(--om-accent)' }}>{displayTitle}</span>
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>
          Compare active eBay listings against raw, PSA 9, and PSA 10 estimates.
        </p>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--om-text-3)' }} />
        <Input
          type="text"
          placeholder="Search variants, numbers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxLength={50}
          className="h-8 pl-9 pr-8 text-xs om-input rounded-lg font-mono"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--om-text-2)' }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
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
      />
    </div>
  );
}
