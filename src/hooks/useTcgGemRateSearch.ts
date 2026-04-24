import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GemRateSearchResult {
  found: boolean;
  gemrateId: string | null;
  matchedName: string | null;
  totalGrades: number | null;
  searchScore: number | null;
  confidence: 'high' | 'medium' | 'low';
  source: 'gemrate';
}

export interface GemRateCardInput {
  product_name: string;
  normalized_name?: string;
  category: 'pokemon' | 'one_piece';
}

// Session-level dedup: same card won't hit the edge function twice per tab
const sessionCache = new Map<string, GemRateSearchResult | null>();

/**
 * Lazy-loads GemRate data for a card via IntersectionObserver.
 *
 * Pass the same containerRef that wraps the card element.
 * Returns a ref to attach to a container element — the fetch fires
 * when that element enters the viewport (rootMargin 100px).
 *
 * Safe to call unconditionally. Never throws or breaks card render.
 */
export function useTcgGemRateSearch(card: GemRateCardInput | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<GemRateSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const cacheKey = card
    ? `${card.category}:${(card.normalized_name || card.product_name).toLowerCase()}`
    : null;

  useEffect(() => {
    if (!card || !cacheKey) return;

    // Reset when the card identity changes
    fetchedRef.current = false;
    setResult(null);

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fetchedRef.current) return;
        fetchedRef.current = true;
        observer.disconnect();

        // Session cache hit — no network call needed
        if (sessionCache.has(cacheKey)) {
          setResult(sessionCache.get(cacheKey) ?? null);
          return;
        }

        setLoading(true);
        supabase.functions
          .invoke('tcg-gemrate-search', {
            body: {
              product_name: card.product_name,
              normalized_name: card.normalized_name || card.product_name,
              category: card.category,
            },
          })
          .then(({ data, error }) => {
            if (error || !data || !(data as GemRateSearchResult).found) {
              sessionCache.set(cacheKey, null);
              return;
            }
            const r = data as GemRateSearchResult;
            sessionCache.set(cacheKey, r);
            setResult(r);
          })
          .catch(() => {
            sessionCache.set(cacheKey, null);
          })
          .finally(() => setLoading(false));
      },
      { rootMargin: '100px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // cacheKey encodes card identity — correct dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return {
    containerRef,
    matchedName: result?.matchedName ?? null,
    totalGrades: result?.totalGrades ?? null,
    confidence: result?.confidence ?? null,
    loading,
  };
}
