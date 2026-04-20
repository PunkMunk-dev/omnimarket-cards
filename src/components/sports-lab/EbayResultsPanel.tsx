import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, ArrowUpDown, Target, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EbayListingCard } from './EbayListingCard';
import { SkeletonCard } from './SkeletonCard';
import { useSportsEbaySearch } from '@/hooks/useSportsEbaySearch';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EbaySearchParams, SortOption, EbayListing } from '@/types/sportsEbay';

const GRADING_COST = 25;

function calcProfit(listing: EbayListing): number {
  const isBuyItNow = listing.buyingOptions?.includes('FIXED_PRICE');
  if (!isBuyItNow || listing.price === null || listing.psa10MarketValue === null) return -Infinity;
  return listing.psa10MarketValue - listing.price - GRADING_COST;
}

function sortListings(listings: EbayListing[], sortOption: SortOption): EbayListing[] {
  const sorted = [...listings];
  switch (sortOption) {
    case 'profit-high': return sorted.sort((a, b) => calcProfit(b) - calcProfit(a));
    case 'price-high': return sorted.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    case 'price-low': return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'quality-high': return sorted.sort((a, b) => (b.imageQualityScore ?? -999) - (a.imageQualityScore ?? -999));
    case 'ending-soon': return sorted.sort((a, b) => (a.itemEndDate ? new Date(a.itemEndDate).getTime() : Infinity) - (b.itemEndDate ? new Date(b.itemEndDate).getTime() : Infinity));
    case 'newest': default: return sorted.sort((a, b) => (b.listingDate ? new Date(b.listingDate).getTime() : 0) - (a.listingDate ? new Date(a.listingDate).getTime() : 0));
  }
}

interface EbayResultsPanelProps {
  searchParams: EbaySearchParams; traitLabels?: string[]; sportKey?: string | null;
  onResultCountChange?: (count: number) => void; onLoadingChange?: (loading: boolean) => void; onReset?: () => void;
}

type PriceRange = 'all' | 'under-10' | '10-50' | '50-100' | '100-250' | '250-500' | '500+';
const PRICE_RANGES: { value: PriceRange; label: string; min: number; max: number | null }[] = [
  { value: 'all', label: 'All Prices', min: 0, max: null },
  { value: 'under-10', label: 'Under $10', min: 0, max: 10 },
  { value: '10-50', label: '$10-$50', min: 10, max: 50 },
  { value: '50-100', label: '$50-$100', min: 50, max: 100 },
  { value: '100-250', label: '$100-$250', min: 100, max: 250 },
  { value: '250-500', label: '$250-$500', min: 250, max: 500 },
  { value: '500+', label: '$500+', min: 500, max: null },
];

export const EbayResultsPanel = React.forwardRef<HTMLDivElement, EbayResultsPanelProps>(function EbayResultsPanel({ searchParams, traitLabels, sportKey, onResultCountChange, onLoadingChange, onReset }: EbayResultsPanelProps, ref) {
  const { listings, isLoading, isLoadingMore, isLoadingAll, error, hasMore, search, loadMore, loadAll, cancelLoadAll, retry } = useSportsEbaySearch();
  const lastSearchRef = useRef<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('profit-high');
  const [filterMode, setFilterMode] = useState<'all' | 'auction' | 'bin'>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filteredCountRef = useRef(0);
  const loadAllTriggeredRef = useRef(false);

  useEffect(() => { setSortOption(filterMode === 'auction' ? 'ending-soon' : 'quality-high'); }, [filterMode]);

  useEffect(() => {
    if (!searchParams.playerName) return;
    const key = JSON.stringify({ playerName: searchParams.playerName, brand: searchParams.brand, traits: searchParams.traits });
    if (key !== lastSearchRef.current) {
      lastSearchRef.current = key;
      loadAllTriggeredRef.current = false;
      search(searchParams);
    }
    return () => { lastSearchRef.current = ''; };
  }, [searchParams, search]);

  useEffect(() => { onLoadingChange?.(isLoading); }, [isLoading, onLoadingChange]);
  useEffect(() => { onResultCountChange?.(listings.length); }, [listings.length, onResultCountChange]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isLoadingAll || error) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading && !isLoadingAll && !error && listings.length > 0) loadMore();
    }, { threshold: 0.1, rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, isLoadingAll, loadMore, error, listings.length]);

  const filteredListings = useMemo(() => {
    let filtered = listings.filter(l => l.price !== null);
    if (filterMode === 'auction') filtered = filtered.filter(l => l.buyingOptions?.includes('AUCTION'));
    else if (filterMode === 'bin') filtered = filtered.filter(l => !l.buyingOptions?.includes('AUCTION'));
    const range = PRICE_RANGES.find(r => r.value === priceRange);
    if (range && priceRange !== 'all') filtered = filtered.filter(l => { const p = l.price ?? 0; return p >= range.min && (range.max === null || p <= range.max); });
    if (traitLabels && traitLabels.length > 1) {
      filtered = filtered.filter(l => { const tl = l.title.toLowerCase(); return traitLabels.every(t => tl.includes(t.toLowerCase())); });
    }
    filteredCountRef.current = filtered.length;
    return filtered;
  }, [listings, filterMode, priceRange, traitLabels]);

  useEffect(() => {
    const hasListings = listings.length > 0;
    if (!isLoading && hasListings && hasMore && !isLoadingAll && !loadAllTriggeredRef.current && !error) {
      loadAllTriggeredRef.current = true;
      loadAll(() => filteredCountRef.current);
    }
    // isLoadingAll and loadAll are intentionally omitted — they're guarded by
    // loadAllTriggeredRef so re-running on their changes would cause duplicate loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, listings.length, hasMore, error]);

  const sortedListings = useMemo(() => sortListings(filteredListings, sortOption), [filteredListings, sortOption]);

  if (isLoading) return (
    <div className="space-y-4"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div></div>
  );

  if (error && listings.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="om-card px-10 py-12 max-w-md">
        <AlertCircle className="w-10 h-10 mb-4 mx-auto" style={{ color: 'var(--om-danger)' }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--om-text-0)' }}>Search Error</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--om-text-2)' }}>{error}</p>
        <Button variant="outline" size="sm" onClick={retry} className="om-btn gap-2 border-white/10" style={{ color: 'var(--om-text-1)' }}>
          <RotateCcw className="h-3.5 w-3.5" />Retry
        </Button>
      </div>
    </div>
  );

  if (!isLoading && listings.length === 0 && !error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="om-card px-10 py-12 max-w-md">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 mx-auto" style={{ background: 'var(--om-bg-3)' }}>
          <Target className="w-7 h-7" style={{ color: 'var(--om-text-3)' }} />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--om-text-0)' }}>No listings found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--om-text-2)' }}>Try adjusting filters or expanding your search.</p>
        {onReset && <Button variant="outline" size="sm" onClick={onReset} className="om-btn gap-2 border-white/10" style={{ color: 'var(--om-text-1)' }}><RotateCcw className="h-3.5 w-3.5" />Clear filters</Button>}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="space-y-4">
      {(isLoadingAll || isLoadingMore) && (
        <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'var(--om-bg-3)' }}>
          <div className="h-full w-2/5 rounded-full" style={{ background: 'var(--om-accent)', animation: 'omniProgress 1.4s ease-in-out infinite' }} />
        </div>
      )}

      {error && listings.length > 0 && (
        <Alert variant="destructive" className="flex items-center justify-between border-white/10" style={{ background: 'rgba(255,92,122,0.1)' }}>
          <AlertDescription className="flex-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={retry} className="ml-4 gap-1.5 shrink-0 om-btn border-white/10">
            <RotateCcw className="h-3 w-3" />Retry
          </Button>
        </Alert>
      )}

      <div className="om-toolbar px-3 py-2.5 flex items-center justify-between flex-nowrap overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="om-pill om-pill-active tabular-nums">
            <span className="font-semibold">{sortedListings.length}</span>
            {listings.length !== sortedListings.length && <span style={{ color: 'var(--om-text-2)' }}> / {listings.length}</span>}
            <span className="ml-0.5" style={{ color: 'var(--om-text-3)' }}>{isLoadingAll ? 'loading…' : hasMore ? 'loaded · more available' : 'cards'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-nowrap">
          <button onClick={() => setFilterMode(filterMode === 'auction' ? 'all' : 'auction')}
            className={cn("om-btn om-pill", filterMode === 'auction' && "om-pill-active")}>
            Auctions
          </button>
          <button onClick={() => setFilterMode(filterMode === 'bin' ? 'all' : 'bin')}
            className={cn("om-btn om-pill", filterMode === 'bin' && "om-pill-active")}>
            Buy It Now
          </button>
          <Select value={priceRange} onValueChange={(v) => setPriceRange(v as PriceRange)}>
            <SelectTrigger className="w-[100px] h-7 text-xs om-input rounded-full border-white/10"><SelectValue placeholder="Price" /></SelectTrigger>
            <SelectContent className="om-dropdown">{PRICE_RANGES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs" style={{ color: 'var(--om-text-1)' }}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
          {hasMore && !isLoadingAll && !error && <button onClick={() => loadAll(() => filteredCountRef.current)} className="om-btn om-pill whitespace-nowrap">Load more</button>}
          {isLoadingAll && <button onClick={cancelLoadAll} className="om-btn om-pill flex items-center gap-1.5 whitespace-nowrap" style={{ background: 'rgba(255,204,102,0.1)', borderColor: 'rgba(255,204,102,0.3)', color: 'var(--om-warning)' }}><Loader2 className="h-3 w-3 animate-spin" />Cancel</button>}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 hidden sm:block" style={{ color: 'var(--om-text-3)' }} />
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[130px] h-7 text-xs om-input rounded-full border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent className="om-dropdown">
                {filterMode === 'auction' && <SelectItem value="ending-soon" className="text-xs" style={{ color: 'var(--om-text-1)' }}>Ending Soonest</SelectItem>}
                <SelectItem value="profit-high" className="text-xs" style={{ color: 'var(--om-text-1)' }}>Best Profit</SelectItem>
                <SelectItem value="newest" className="text-xs" style={{ color: 'var(--om-text-1)' }}>Newest</SelectItem>
                <SelectItem value="quality-high" className="text-xs" style={{ color: 'var(--om-text-1)' }}>Best Match</SelectItem>
                <SelectItem value="price-low" className="text-xs" style={{ color: 'var(--om-text-1)' }}>Price: Low → High</SelectItem>
                <SelectItem value="price-high" className="text-xs" style={{ color: 'var(--om-text-1)' }}>Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {sortedListings.map((listing, i) => <EbayListingCard key={`${listing.itemId}-${i}`} listing={listing} sportKey={sportKey} isAuctionMode={filterMode === 'auction'} />)}
      </div>
      {hasMore && !error && <div ref={sentinelRef} className="flex items-center justify-center py-8">
        {isLoadingMore ? <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--om-accent)' }} /><span className="text-sm" style={{ color: 'var(--om-text-2)' }}>Loading more cards...</span></div> : <div className="h-8" />}
      </div>}
    </div>
  );
});
