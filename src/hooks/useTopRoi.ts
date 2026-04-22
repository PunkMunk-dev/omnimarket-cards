import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Game } from '@/types/tcg';
import {
  passesPriceFilter,
  passesNameFilter,
  computeConfidence,
  computeOpportunityScore,
  getHotnessLabel,
  getRoiBucket as _getRoiBucket,
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
  profit: number;
  roi: number;
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
        .select('id, product_name, normalized_name, category, loose_price, graded_price')
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
          const name = (c.normalized_name || c.product_name || '') as string;

          const profit = Math.round((graded - raw) * 100) / 100;
          const roi = Math.round((profit / raw) * 10) / 10;

          const { score: confidence, label: confidenceLabel } = computeConfidence(raw, graded);
          const opportunityScore = computeOpportunityScore(raw, graded, name, confidence);
          const hotnessLabel = getHotnessLabel(name, profit, roi, raw, confidenceLabel);

          return {
            id: c.id,
            product_name: c.product_name,
            normalized_name: name,
            category: c.category,
            loose_price: raw,
            graded_price: graded,
            profit,
            roi,
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
