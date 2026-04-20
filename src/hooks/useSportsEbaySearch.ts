import { useState, useCallback, useRef, useEffect } from 'react';
import type { EbayListing, EbaySearchParams, EbaySearchResponse, Psa10PriceResponse } from '@/types/sportsEbay';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function invokeEdgeFunction<T>(name: string, body: object, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  // Link external signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429) {
      throw new Error('Rate limited by eBay. Please wait a moment and try again.');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Search failed (${res.status})${text ? `: ${text}` : ''}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

interface UseSportsEbaySearchResult {
  listings: EbayListing[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isLoadingAll: boolean;
  error: string | null;
  hasMore: boolean;
  search: (params: EbaySearchParams) => void;
  loadMore: () => void;
  loadAll: (getFilteredCount?: () => number) => void;
  cancelLoadAll: () => void;
  retry: () => void;
}

const DEBOUNCE_MS = 150;
const MAX_LOAD_ALL_PAGES = 20;
const LOAD_ALL_DELAY_MS = 100;
const MIN_FILTERED_TARGET = 200;

export function useSportsEbaySearch(): UseSportsEbaySearchResult {
  const [listings, setListings] = useState<EbayListing[]>([]);
  const listingsRef = useRef<EbayListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => { listingsRef.current = listings; }, [listings]);

  const paginationRef = useRef<{ nextOffset?: number; currentParams?: EbaySearchParams }>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadAllAbortRef = useRef<AbortController | null>(null);
  const hasMoreRef = useRef(false);
  const totalPagesLoadedRef = useRef(0);
  const lastOffsetRef = useRef<string>(''); // Loop breaker

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (loadAllAbortRef.current) loadAllAbortRef.current.abort();
    };
  }, []);

  const updateHasMore = (value: boolean) => {
    setHasMore(value);
    hasMoreRef.current = value;
  };

  const search = useCallback((params: EbaySearchParams) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (loadAllAbortRef.current) { loadAllAbortRef.current.abort(); setIsLoadingAll(false); }

    paginationRef.current = { currentParams: params };
    updateHasMore(false);
    totalPagesLoadedRef.current = 0;
    lastOffsetRef.current = '';
    setError(null);
    setIsLoading(true);
    setListings([]);

    debounceTimerRef.current = setTimeout(async () => {
      const ac = new AbortController();
      abortControllerRef.current = ac;
      try {
        console.log('[SportsSearch] Fetching:', params.playerName);
        const data = await invokeEdgeFunction<EbaySearchResponse>('sports-ebay-search', params, ac.signal);
        if (ac.signal.aborted) return;
        if (!data?.success) throw new Error(data?.error || 'Search failed');
        console.log('[SportsSearch] Got', data.listings.length, 'listings');

        paginationRef.current = { currentParams: params, nextOffset: data.nextOffset };
        updateHasMore(data.hasMore ?? false);

        const enriched = data.listings.map(l => ({ ...l, searchContext: { playerName: params.playerName, brand: params.brand, year: params.year, traits: params.traits } }));
        const seen = new Set<string>();
        const deduped = enriched.filter(l => { if (seen.has(l.itemId)) return false; seen.add(l.itemId); return true; });
        setListings(deduped);
        setError(null);
        setIsLoading(false);
        fetchPsa10Price(params);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Failed to search eBay';
        setError(msg);
        setListings([]);
        setIsLoading(false);
        updateHasMore(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const loadMore = useCallback(async () => {
    const { currentParams, nextOffset } = paginationRef.current;
    if (!currentParams || isLoadingMore || nextOffset === undefined) return;
    if (nextOffset > 2000) { updateHasMore(false); return; }

    // Loop breaker: detect repeated tokens
    const tokenKey = `${nextOffset}`;
    if (tokenKey === lastOffsetRef.current) { updateHasMore(false); return; }
    lastOffsetRef.current = tokenKey;

    setIsLoadingMore(true);
    setError(null);
    try {
      const data = await invokeEdgeFunction<EbaySearchResponse>('sports-ebay-search', {
        ...currentParams, offset: nextOffset,
      });
      if (!data?.success) throw new Error(data?.error || 'Failed to load more');

      if (data.listings.length === 0) {
        updateHasMore(false);
      } else {
        paginationRef.current = { currentParams, nextOffset: data.nextOffset };
        updateHasMore(data.hasMore ?? false);

        const enriched = data.listings.map(l => ({ ...l, searchContext: { playerName: currentParams.playerName, brand: currentParams.brand, year: currentParams.year, traits: currentParams.traits } }));
        setListings(prev => {
          const ids = new Set(prev.map(l => l.itemId));
          return [...prev, ...enriched.filter(l => !ids.has(l.itemId))];
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load more results';
      setError(msg);
      updateHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore]);

  const loadAll = useCallback(async (getFilteredCount?: () => number) => {
    const { currentParams } = paginationRef.current;
    if (!currentParams || isLoadingAll || !hasMoreRef.current) return;
    if (totalPagesLoadedRef.current >= MAX_LOAD_ALL_PAGES) { updateHasMore(false); return; }

    loadAllAbortRef.current = new AbortController();
    setIsLoadingAll(true);
    setError(null);
    let pagesLoaded = 0;
    let moreAvailable = true;
    const maxPages = MAX_LOAD_ALL_PAGES - totalPagesLoadedRef.current;
    const seenIds = new Set<string>(listingsRef.current.map(l => l.itemId));

    try {
      while (moreAvailable && pagesLoaded < maxPages) {
        if (loadAllAbortRef.current?.signal.aborted) break;
        if (getFilteredCount && getFilteredCount() >= MIN_FILTERED_TARGET) break;
        const { nextOffset } = paginationRef.current;
        if (nextOffset === undefined) break;
        if (nextOffset > 2000) break;

        // Loop breaker
        const tokenKey = `${nextOffset}`;
        if (tokenKey === lastOffsetRef.current) break;
        lastOffsetRef.current = tokenKey;

        const data = await invokeEdgeFunction<EbaySearchResponse>('sports-ebay-search', {
          ...currentParams, offset: nextOffset,
        }, loadAllAbortRef.current.signal);

        if (loadAllAbortRef.current?.signal.aborted) break;
        if (!data?.success) {
          setError(data?.error || 'Failed to load results');
          break;
        }

        if (data.listings.length === 0) {
          moreAvailable = false;
          break;
        }

        moreAvailable = data.hasMore ?? false;
        paginationRef.current = { currentParams, nextOffset: data.nextOffset };
        updateHasMore(moreAvailable);

        const enriched = data.listings.map(l => ({ ...l, searchContext: { playerName: currentParams.playerName, brand: currentParams.brand, year: currentParams.year, traits: currentParams.traits } }));
        const unique = enriched.filter(l => !seenIds.has(l.itemId));
        unique.forEach(l => seenIds.add(l.itemId));
        if (unique.length > 0) setListings(prev => [...prev, ...unique]);

        pagesLoaded++;
        totalPagesLoadedRef.current++;
        if (!moreAvailable) break;
        await new Promise(r => setTimeout(r, LOAD_ALL_DELAY_MS));
      }
      // Don't force hasMore=false if there truly are more pages – only set false if we exhausted
      if (!moreAvailable) {
        updateHasMore(false);
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
        updateHasMore(false);
      }
    } finally {
      setIsLoadingAll(false);
      loadAllAbortRef.current = null;
    }
  }, [isLoadingAll]);

  const cancelLoadAll = useCallback(() => {
    if (loadAllAbortRef.current) { loadAllAbortRef.current.abort(); setIsLoadingAll(false); }
  }, []);

  const retry = useCallback(() => {
    const { currentParams } = paginationRef.current;
    if (currentParams) {
      setError(null);
      search(currentParams);
    }
  }, [search]);

  const fetchPsa10Price = async (params: EbaySearchParams) => {
    try {
      const data = await invokeEdgeFunction<Psa10PriceResponse>('sports-ebay-sold-psa', {
        playerName: params.playerName, brand: params.brand,
      });
      if (!data?.success || data.marketValue === null) return;
      setListings(prev => prev.map(l => ({ ...l, psa10MarketValue: data.marketValue, psa10MarketValueConfidence: data.marketValueConfidence, psa10SoldComps: data.soldComps })));
    } catch { /* non-critical */ }
  };

  return { listings, isLoading, isLoadingMore, isLoadingAll, error, hasMore, search, loadMore, loadAll, cancelLoadAll, retry };
}
