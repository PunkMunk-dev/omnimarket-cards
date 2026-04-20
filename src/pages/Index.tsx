import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowRight, ChevronRight, Star, X } from "lucide-react";
import psaMosaic from "@/assets/psa-mosaic.jpg";
import { Button } from "@/components/ui/button";
import { SearchFilters } from "@/components/SearchFilters";
import { ListingGrid } from "@/components/ListingGrid";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import { ResultsHeader } from "@/components/ResultsHeader";
import { searchEbay } from "@/lib/ebay-api";
import { useSharedWatchlist } from "@/contexts/WatchlistContext";
import type { EbayItem, SortOption } from "@/types/ebay";

function deriveBuyingOptions(sort: SortOption): 'ALL' | 'AUCTION' | 'FIXED_PRICE' {
  if (sort === 'auction_only') return 'AUCTION';
  if (sort === 'buy_now_only') return 'FIXED_PRICE';
  return 'ALL';
}

/* ── Recent-searches helpers ── */
const RECENT_SEARCHES_KEY = "omni_recent_searches_v1";

function pushRecentSearch(term: string) {
  const t = (term || "").trim();
  if (!t) return;
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]") as string[];
    const next = [t, ...existing.filter((x) => x !== t)].slice(0, 12);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch (_e) { /* localStorage unavailable */ }
}

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlSrc = searchParams.get('src') || '';
  const [query, setQuery] = useState(urlQuery);
  const [items, setItems] = useState<EbayItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!urlQuery);
  const [sort, setSort] = useState<SortOption>("best");
  const [error, setError] = useState<string | null>(null);
  const [fromWatchlist, setFromWatchlist] = useState(urlSrc === 'wl');
  const abortRef = useRef<AbortController | null>(null);
  const lastSearchedRef = useRef<string>('');

  // Search when URL query changes (handles both mount and header-nav)
  useEffect(() => {
    if (urlQuery && urlQuery !== lastSearchedRef.current) {
      lastSearchedRef.current = urlQuery;
      setQuery(urlQuery);
      setError(null);
      setFromWatchlist(urlSrc === 'wl');
      performSearch(urlQuery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, urlSrc]);

  const { watchlist, isInWatchlist, toggleWatchlist } = useSharedWatchlist();

  const performSearch = useCallback(async (
    searchQuery: string, 
    page: number = 1, 
    append: boolean = false,
    overrideSort?: SortOption
  ) => {
    if (!searchQuery.trim()) return;

    pushRecentSearch(searchQuery);

    // Abort previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (page === 1) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    const activeSort = overrideSort ?? sort;

    try {
      const response = await searchEbay({
        query: searchQuery,
        page,
        limit: 48,
        sort: activeSort,
        buyingOptions: deriveBuyingOptions(activeSort),
      });

      if (ac.signal.aborted) return;

      if (append) {
        setItems(prev => {
          const existingIds = new Set(prev.map(item => item.itemId));
          const newItems = response.items.filter(item => !existingIds.has(item.itemId));
          return [...prev, ...newItems];
        });
      } else {
        setItems(response.items);
      }
      
      setTotal(response.total);
      setNextPage(response.items.length > 0 ? response.nextPage : null);
      setHasSearched(true);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Failed to search eBay';
      console.error('Search error:', err);
      setError(msg);
      if (!append) {
        setItems([]);
        setNextPage(null);
      }
      toast.error(msg);
    } finally {
      if (!ac.signal.aborted) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [sort]);

  const handleLoadMore = () => {
    if (nextPage && query && !isLoadingMore) {
      performSearch(query, nextPage, true);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    if (query && hasSearched) {
      setError(null);
      performSearch(query, 1, false, newSort);
    }
  };

  const handleRetry = () => {
    if (query) {
      setError(null);
      performSearch(query, 1, false);
    }
  };

  const marketTilesRef = useRef<HTMLDivElement>(null);

  const handleStartSearching = () => {
    const input = document.querySelector<HTMLInputElement>('header input[type="text"], header input[type="search"]');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => input.focus(), 400);
    }
  };

  const handleExploreMarkets = () => marketTilesRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-[calc(100vh-48px)] bg-background pb-16 sm:pb-0">
      {/* Toolbar: sort + results count */}
      {hasSearched && (
        <div className="border-b border-border bg-card/50">
          <div className="container flex items-center gap-4 h-11">
            <SearchFilters sort={sort} onSortChange={handleSortChange} />
            <ResultsHeader 
              query={query} 
              total={total} 
              showing={items.length}
              hasMore={!!nextPage}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
            />
          </div>
          {fromWatchlist && (
            <div className="container flex items-center gap-2 pb-2">
              <div className="inline-flex items-center gap-1.5 bg-secondary/60 text-secondary-foreground px-3 py-1 rounded-full text-xs">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span>Showing results for "<strong>{query}</strong>" (from starred card)</span>
                <button
                  onClick={() => setFromWatchlist(false)}
                  className="ml-1 rounded-full p-0.5 hover:bg-secondary transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="container py-6">
        {isLoading && items.length === 0 ? (
          <LoadingGrid />
        ) : error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-lg border shadow-sm bg-card px-10 py-12 max-w-md">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <button onClick={handleRetry} className="text-sm font-medium text-primary hover:underline">
                Retry Search
              </button>
            </div>
          </div>
        ) : hasSearched && items.length > 0 ? (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className={isLoading ? "opacity-50 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
            <ListingGrid 
              items={items}
              isInWatchlist={isInWatchlist}
              onToggleWatchlist={toggleWatchlist}
            />
            {nextPage && (
              <div className="flex justify-center pt-6">
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Loading…</>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
            </div>
          </div>
        ) : hasSearched ? (
          <EmptyState query={query} />
        ) : (
          <div className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, var(--om-bg-0) 0%, var(--om-bg-1) 50%, var(--om-bg-0) 100%)`, color: 'var(--om-text-0)' }}>
            {/* Hero spotlight ambient pulse */}
            <div className="omni-hero-spotlight" />
            {/* Grid texture */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            {/* PSA mosaic blurred texture */}
            <div
              className="pointer-events-none absolute inset-0 scale-110 blur-[28px] opacity-[0.07]"
              style={{
                backgroundImage: `url(${psaMosaic})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
              }}
            />
            {/* Cyan glow top-left */}
            <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px]" style={{ background: 'rgba(10,132,255,0.10)' }} />
            {/* Blue glow bottom-right */}
            <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px]" style={{ background: 'rgba(10,132,255,0.08)' }} />

            <div className="relative mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8">
              {/* ── Hero — centered single column ── */}
              <div className="flex flex-col items-center text-center min-h-[70vh] justify-center py-16 md:py-24">
                <span className="text-[11px] font-medium uppercase tracking-[0.30em]" style={{ color: 'var(--om-text-1)' }}>OmniMarket Cards</span>

                <h1 className="mt-6 text-[36px] md:text-[48px] font-semibold tracking-[-0.03em] leading-[1.08] max-w-[600px]" style={{ color: 'var(--om-text-0)' }}>
                  Discover the market before it moves.
                </h1>
                <p className="mt-4 max-w-[480px] text-[14px] leading-[1.55]" style={{ color: 'var(--om-text-2)' }}>
                  Search live eBay listings instantly—or jump into a market view built for finding undervalued cards fast.
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleStartSearching}
                    className="inline-flex items-center justify-center rounded-xl h-11 px-6 text-sm font-medium hover:-translate-y-px active:scale-[0.98] transition-all duration-200"
                    style={{ background: 'var(--om-accent)', color: '#fff', boxShadow: '0 10px 30px rgba(10,132,255,0.20)' }}
                  >
                    Start Searching
                  </button>
                  <button
                    onClick={handleExploreMarkets}
                    className="inline-flex items-center justify-center rounded-xl h-11 px-6 text-sm font-medium hover:-translate-y-px active:scale-[0.98] transition-all duration-200"
                    style={{ background: 'var(--om-border-0)', border: '1px solid var(--om-border-1)', color: 'var(--om-text-0)' }}
                  >
                    Explore Markets <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Market Tiles ── */}
              <div ref={marketTilesRef} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                <Link
                  to="/tcg"
                  className="group rounded-3xl p-10 hover:-translate-y-[3px] transition-all duration-200 flex flex-col"
                  style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)', boxShadow: '0 20px 60px var(--glass-shadow)', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  <h3 className="text-[16px] font-semibold" style={{ color: 'var(--om-text-0)' }}>TCG Market</h3>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--om-text-2)' }}>Search Pokémon &amp; One Piece cards by chase, set, and more.</p>
                  <span className="mt-4 inline-flex items-center justify-center rounded-xl h-10 px-5 text-sm font-medium w-fit hover:-translate-y-px active:scale-[0.98] transition-all duration-200" style={{ background: 'var(--om-accent)', color: '#fff' }}>
                    Explore TCG Market <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </span>
                </Link>
                <Link
                  to="/sports"
                  className="group rounded-3xl p-10 hover:-translate-y-[3px] transition-all duration-200 flex flex-col"
                  style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)', boxShadow: '0 20px 60px var(--glass-shadow)', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  <h3 className="text-[16px] font-semibold" style={{ color: 'var(--om-text-0)' }}>Sports Market</h3>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--om-text-2)' }}>Search sports cards by player, brand, and traits.</p>
                  <span className="mt-4 inline-flex items-center justify-center rounded-xl h-10 px-5 text-sm font-medium w-fit hover:-translate-y-px active:scale-[0.98] transition-all duration-200" style={{ background: 'var(--om-accent)', color: '#fff' }}>
                    Explore Sports Market <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
