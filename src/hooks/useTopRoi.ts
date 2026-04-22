import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Game } from '@/types/tcg';

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
  blended_score: number;
}

export type HotnessLabel = 'Heating Up' | 'Spread Widening' | 'High Upside' | 'New Release Momentum';
export type RoiBucket = 'Best ROI' | 'Best Spread' | 'Low Risk' | 'Emerging';

const HEAT_NAMES = [
  'charizard', 'luffy', 'mewtwo', 'pikachu', 'rayquaza',
  'shanks', 'umbreon', 'zoro', 'lugia', 'gengar',
];
const NEW_SET_TOKENS = [
  'sv09', 'sv9', 'op13', 'op12', 'twilight masquerade',
  'stellar crown', 'shrouded fable', 'paldean fates',
];
const JUNK_TERMS = [
  'lot', ' pack', 'box', 'bundle', 'sealed', 'display',
  'booster', 'tin', 'code card', 'collection',
];
const CHASE_KEYWORDS: Array<[string[], number]> = [
  [['vmax', 'vstar', 'alt art', 'alternate art'], 10],
  [['full art', 'rainbow', 'illustration rare', 'special art'], 8],
  [['secret rare', 'hyper rare', 'gold star', '1st edition'], 6],
];

export function getHotnessLabel(card: TopRoiCard): HotnessLabel | null {
  const name = card.normalized_name.toLowerCase();
  if (NEW_SET_TOKENS.some(t => name.includes(t))) return 'New Release Momentum';
  if (card.roi >= 200 && card.loose_price >= 5 && card.loose_price <= 50) return 'High Upside';
  if (card.profit >= 100) return 'Spread Widening';
  if (card.roi >= 50 && HEAT_NAMES.some(k => name.includes(k))) return 'Heating Up';
  return null;
}

export function getRoiBucket(card: TopRoiCard): RoiBucket {
  if (card.loose_price >= 5 && card.loose_price <= 30 && card.roi >= 50 && card.profit >= 5) return 'Low Risk';
  if (card.profit >= 80) return 'Best Spread';
  if (card.roi >= 150) return 'Best ROI';
  return 'Emerging';
}

function computeBlendedScore(card: { loose_price: number; graded_price: number; normalized_name: string }): number {
  const profit = card.graded_price - card.loose_price;
  const name = card.normalized_name.toLowerCase();
  const roiScore = Math.min(profit / card.loose_price, 5.0) / 5.0 * 40;
  const spreadScore = Math.min(profit, 500) / 500 * 30;
  const qualityScore = card.graded_price > 100 ? 20 : card.graded_price > 50 ? 15 : card.graded_price > 20 ? 8 : 0;
  const keywordBoost = CHASE_KEYWORDS.reduce((boost, [terms, pts]) =>
    boost === 0 && terms.some(t => name.includes(t)) ? pts : boost, 0);
  return roiScore + spreadScore + qualityScore + keywordBoost;
}

export function useTopRoi(game: Game | null, limit = 150) {
  const category = game ? GAME_CATEGORY[game] : null;

  return useQuery({
    queryKey: ['top-roi', category],
    queryFn: async (): Promise<TopRoiCard[]> => {
      // Fetch high-value rows server-side, score + filter client-side.
      // Cannot use computed ORDER BY via PostgREST, so we fetch the top 500 by
      // graded_price desc (high-value proxy) then rank by blended score.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('pricecharting_tcg_cards')
        .select('id, product_name, normalized_name, category, loose_price, graded_price')
        .gte('loose_price', 3)
        .gt('graded_price', 0)
        .order('graded_price', { ascending: false })
        .limit(500);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? [])
        .filter((c: any) => {
          if (!c.loose_price || !c.graded_price) return false;
          if (c.graded_price <= c.loose_price) return false;
          if ((c.graded_price - c.loose_price) < 5) return false;
          const name = (c.normalized_name || '').toLowerCase();
          if (JUNK_TERMS.some(j => name.includes(j))) return false;
          return true;
        })
        .map((c: any) => {
          const profit = Math.round((c.graded_price - c.loose_price) * 100) / 100;
          const roi = Math.round((profit / c.loose_price) * 10) / 10;
          return {
            id: c.id,
            product_name: c.product_name,
            normalized_name: c.normalized_name || '',
            category: c.category,
            loose_price: c.loose_price,
            graded_price: c.graded_price,
            profit,
            roi,
            blended_score: computeBlendedScore(c),
          } as TopRoiCard;
        })
        .sort((a: TopRoiCard, b: TopRoiCard) => b.blended_score - a.blended_score)
        .slice(0, limit);
    },
    staleTime: 10 * 60_000,
  });
}
