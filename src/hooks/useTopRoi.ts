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

// Chase names that trend — keep alphabetical for easy maintenance
const HEAT_NAMES = [
  'charizard', 'luffy', 'mewtwo', 'pikachu', 'rayquaza',
  'shanks', 'umbreon', 'zoro', 'lugia', 'gengar',
];

// Set code fragments for recency boost
const NEW_SET_TOKENS = [
  'sv09', 'sv9', 'op13', 'op12', 'twilight masquerade',
  'stellar crown', 'shrouded fable', 'paldean fates',
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

export function useTopRoi(game: Game | null, limit = 150) {
  const category = game ? GAME_CATEGORY[game] : null;

  return useQuery({
    queryKey: ['top-roi', category],
    queryFn: async (): Promise<TopRoiCard[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_tcg_top_roi', {
        p_category: category,
        p_min_loose: 3,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as TopRoiCard[];
    },
    staleTime: 10 * 60_000,
  });
}
