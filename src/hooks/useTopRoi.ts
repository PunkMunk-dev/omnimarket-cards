import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Game } from '@/types/tcg';
import {
  passesPriceFilter,
  passesNameFilter,
  computeConfidence,
  computeOpportunityScoreV2,
  getHotnessLabel,
  getRoiBucket as _getRoiBucket,
  isSafeFlip,
} from '@/lib/tcgScoring';

// Re-export types so existing imports keep working
export type { HotnessLabel, RoiBucket, ConfidenceLabel } from '@/lib/tcgScoring';

const GAME_CATEGORY: Record<Game, string> = {
  pokemon: 'pokemon',
  one_piece: 'onepiece',
};

export interface TopRoiCard {
  id: number;
  product_name: string;
  normalized_name: string;
  category: string;
  loose_price: number;
  graded_price: number;
  grade9_price: number | null;
  profit: number;
  roi: number;
  psa9Spread: number | null;  // psa9 - loose_price (raw DB spread, not listing-price spread)
  isSafeFlip: boolean;        // psa9 >= loose_price + grading cost
  confidence: number;
  confidenceLabel: import('@/lib/tcgScoring').ConfidenceLabel;
  opportunityScore: number;
  hotnessLabel: import('@/lib/tcgScoring').HotnessLabel | null;
}

/** Convenience wrapper — accepts a TopRoiCard so call-sites stay clean. */
export function getRoiBucket(card: TopRoiCard): import('@/lib/tcgScoring').RoiBucket {
  return _getRoiBucket(card.roi, card.profit, card.confidenceLabel);
}

/** @deprecated use card.hotnessLabel directly */
export function getHotnessLabel_compat(card: TopRoiCard) {
  return card.hotnessLabel;
}

export function useTopRoi(game: Game | null, limit = 150) {
  const category = game ? GAME_CATEGORY[game] : null;

  return useQuery({
    queryKey: ['top-roi', category],
    queryFn: async (): Promise<TopRoiCard[]> => {
      // Fetch top 600 by graded_price desc — a high-value proxy for opportunity.
      // Cannot use computed ORDER BY via PostgREST, so we score + sort client-side.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('pricecharting_tcg_cards')
        .select('id, product_name, normalized_name, category, loose_price, graded_price, grade9_price')
        .gte('loose_price', 15)       // raw floor — pre-filter at query level
        .gte('graded_price', 50)      // graded floor — pre-filter at query level
        .gt('graded_price', 0)
        .order('graded_price', { ascending: false })
        .limit(600);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => {
          if (!passesPriceFilter(c.loose_price, c.graded_price)) return false;
          if (!passesNameFilter(c.normalized_name || c.product_name || '')) return false;
          return true;
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any): TopRoiCard => {
          const raw = c.loose_price as number;
          const graded = c.graded_price as number;
          const psa9 = (c.grade9_price ?? null) as number | null;
          const name = (c.normalized_name || c.product_name || '') as string;

          // profit = raw DB spread (PSA10 - loose); grading cost excluded intentionally —
          // this is a market-level ranking signal, not a take-home profit figure.
          const profit = Math.round((graded - raw) * 100) / 100;
          // roi stored as a true percentage (e.g., 150.0 = 150%) for correct threshold comparisons
          const roi = Math.round((profit / raw) * 1000) / 10;
          const psa9Spread = psa9 !== null ? Math.round((psa9 - raw) * 100) / 100 : null;

          const { score: confidence, label: confidenceLabel } = computeConfidence(raw, graded);
          const opportunityScore = computeOpportunityScoreV2(raw, graded, psa9, name, confidence);
          const hotnessLabel = getHotnessLabel(name, profit, roi, raw, confidenceLabel);

          return {
            id: c.id,
            product_name: c.product_name,
            normalized_name: name,
            category: c.category,
            loose_price: raw,
            graded_price: graded,
            grade9_price: psa9,
            profit,
            roi,
            psa9Spread,
            isSafeFlip: isSafeFlip(psa9, raw),
            confidence,
            confidenceLabel,
            opportunityScore,
            hotnessLabel,
          };
        })
        .sort((a: TopRoiCard, b: TopRoiCard) => b.opportunityScore - a.opportunityScore)
        .slice(0, limit);
    },
    staleTime: 10 * 60_000,
  });
}
