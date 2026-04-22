import { useState, useMemo, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { TerminalGrid } from './TerminalGrid';
import { ResultsToolbar, PRICE_RANGES, type PriceRange } from './ResultsToolbar';
import { searchActiveListings } from '@/services/tcgEbayService';
import { filterTcgListings, dedupeTcgListings } from '@/lib/tcgFilters';
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
  const [showAuctionsOnly, setShowAuctionsOnly] = useState(false);
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

  const filters: SearchFilters = {
    sort,
    excludeLots: true,
    excludeSealed: true,
    rawOnly: true,
    minPrice: showAuctionsOnly ? 0 : Math.max(10, priceRangeConfig.min),
    maxPrice: showAuctionsOnly ? 0 : priceRangeConfig.max,
    cardType: 'single',
    buyingOptions: showAuctionsOnly ? 'AUCTION' : undefined,
  };

  const {
    data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['terminal-listings', 'tcg', game, activeQuery, filters, showAuctionsOnly],
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
    if (sort === 'best_match') {
      final = [...final].sort((a, b) => (b.watchCount ?? 0) - (a.watchCount ?? 0));
    }
    return { listings: final, removedCount, dupsRemoved: result.duplicatesRemoved };
  }, [allListings, game, sort]);

  return (
    <div className="space-y-4">
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
        showAuctionsOnly={showAuctionsOnly}
        onToggleAuctions={() => {
          setShowAuctionsOnly(prev => {
            const next = !prev;
            setSort(next ? 'ending_soonest' : 'best_match');
            return next;
          });
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
