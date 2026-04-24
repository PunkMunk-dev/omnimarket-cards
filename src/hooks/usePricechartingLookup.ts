import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PricechartingResult } from '@/types/pricecharting';
import type { Game } from '@/types/tcg';

// Deduplicate within session — same eBay title won't re-fetch
const sessionCache = new Map<string, PricechartingResult | null>();

const GAME_CATEGORY: Record<Game, string> = {
  pokemon: 'pokemon',
  one_piece: 'onepiece',
};

export function usePricechartingLookup(sourceTitle: string, game?: Game) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pricingData, setPricingData] = useState<PricechartingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  const cacheKey = game ? `${game}:${sourceTitle}` : sourceTitle;
  const category = game ? GAME_CATEGORY[game] : undefined;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fetchedRef.current) return;
        fetchedRef.current = true;
        observer.disconnect();

        // Session cache hit
        if (sessionCache.has(cacheKey)) {
          setPricingData(sessionCache.get(cacheKey) ?? null);
          return;
        }

        setIsLoading(true);
        supabase.functions
          .invoke('pricecharting-tcg-lookup', {
            body: { sourceTitle, ...(category && { category }) },
          })
          .then(({ data, error }) => {
            if (error || !data || data.status !== 'success') {
              sessionCache.set(cacheKey, null);
              return;
            }
            const result = data as PricechartingResult;
            sessionCache.set(cacheKey, result);
            setPricingData(result);
          })
          .finally(() => setIsLoading(false));
      },
      { rootMargin: '150px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  // Only run once per sourceTitle + game mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, pricingData, isLoading };
}
