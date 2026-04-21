import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PricechartingResult } from '@/types/pricecharting';

// Deduplicate within session — same eBay title won't re-fetch
const sessionCache = new Map<string, PricechartingResult | null>();

export function usePricechartingLookup(sourceTitle: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pricingData, setPricingData] = useState<PricechartingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fetchedRef.current) return;
        fetchedRef.current = true;
        observer.disconnect();

        // Session cache hit
        if (sessionCache.has(sourceTitle)) {
          setPricingData(sessionCache.get(sourceTitle) ?? null);
          return;
        }

        setIsLoading(true);
        supabase.functions
          .invoke('pricecharting-tcg-lookup', { body: { sourceTitle } })
          .then(({ data, error }) => {
            if (error || !data || data.status !== 'success') {
              sessionCache.set(sourceTitle, null);
              return;
            }
            // Hide low-confidence results
            if (data.matchConfidence === 'low') {
              sessionCache.set(sourceTitle, null);
              return;
            }
            const result = data as PricechartingResult;
            sessionCache.set(sourceTitle, result);
            setPricingData(result);
          })
          .finally(() => setIsLoading(false));
      },
      { rootMargin: '150px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  // Only run once per sourceTitle mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, pricingData, isLoading };
}
