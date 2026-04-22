import { useState, useEffect, useRef } from 'react';
import type { EbayListing } from '@/types/sportsEbay';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useSportsGemRate(searchContext: EbayListing['searchContext'], enabled: boolean) {
  const [result, setResult] = useState<{ isLoading: boolean; gemRate: number | null; psa10Pop: number | null; totalPsaPop: number | null; psa10Url: string | null; error: string | null }>({
    isLoading: false, gemRate: null, psa10Pop: null, totalPsaPop: null, psa10Url: null, error: null,
  });
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasFetchedRef.current || !searchContext?.playerName) return;
    hasFetchedRef.current = true;

    const fetchGemRate = async () => {
      setResult(prev => ({ ...prev, isLoading: true }));
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sports-ebay-gem-rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ playerName: searchContext.playerName, year: searchContext.year, brand: searchContext.brand, traits: searchContext.traits }),
        });
        const data = await response.json();
        if (data.success) {
          setResult({ isLoading: false, gemRate: data.gemRate, psa10Pop: data.psa10Pop, totalPsaPop: data.totalPsaPop, psa10Url: data.psa10Url, error: null });
        } else {
          setResult({ isLoading: false, gemRate: null, psa10Pop: null, totalPsaPop: null, psa10Url: null, error: data.error || 'Failed' });
        }
      } catch (err) {
        setResult({ isLoading: false, gemRate: null, psa10Pop: null, totalPsaPop: null, psa10Url: null, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    };
    fetchGemRate();
  }, [enabled, searchContext]);

  return result;
}
