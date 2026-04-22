import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TcgTarget, TcgTrait, TcgSet, Game } from '@/types/tcg';

// Maps Game type to pricecharting_tcg_cards category value
const GAME_CATEGORY: Record<Game, string> = {
  pokemon: 'pokemon',
  one_piece: 'onepiece',
};

// ── Entity dropdown ─────────────────────────────────────────────────────────

export interface TcgEntityOption {
  id: string;
  label: string;
  slug: string;
}

export function useTcgEntities(game: Game | null) {
  return useQuery({
    queryKey: ['tcg-entities', game],
    queryFn: async (): Promise<TcgEntityOption[]> => {
      if (!game) return [];
      const { data, error } = await supabase
        .from('tcg_entities' as Parameters<typeof supabase.from>[0])
        .select('id, name, slug')
        .eq('category', game)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((e: { id: string; name: string; slug: string }) => ({
        id: e.id,
        label: e.name,
        slug: e.slug,
      }));
    },
    enabled: !!game,
    staleTime: 10 * 60_000,
  });
}

// ── Ranked PriceCharting card matches ───────────────────────────────────────

const RARE_KEYWORDS = [
  'vmax', 'vstar', 'alt art', 'alternate art', 'rainbow', 'gold star',
  'secret rare', 'hyper rare', 'full art', 'illustration rare', 'special art',
  'sar', 'sir', 'gar', 'sp card', 'trophy', '1st edition',
];

interface RawPricechartingCard {
  id: number;
  product_name: string;
  normalized_name: string | null;
  loose_price: number | null;
  graded_price: number | null;
}

export interface RankedPricechartingCard extends RawPricechartingCard {
  score: number;
  profit: number | null;
  roi: number | null;
}

function rankCards(entityName: string, cards: RawPricechartingCard[]): RankedPricechartingCard[] {
  const q = entityName.toLowerCase().trim();
  return cards
    .map(card => {
      const name = (card.normalized_name ?? card.product_name).toLowerCase();
      let score = 0;

      // Structural match tiers
      if (name === q) score = 100;
      else if (name.startsWith(q + ' ')) score = 60;
      else if (name.includes(q)) score = 30;
      else return { ...card, score: -1, profit: null, roi: null };

      // Boost rare/valuable card types
      for (const kw of RARE_KEYWORDS) {
        if (name.includes(kw)) { score += 10; break; }
      }

      const loose = card.loose_price ?? 0;
      const graded = card.graded_price ?? 0;
      const profit = graded > 0 ? Math.round((graded - loose - 25) * 100) / 100 : null;
      const roi = profit !== null && loose > 0 ? Math.round((profit / loose) * 100) : null;

      return { ...card, score, profit, roi };
    })
    .filter(c => c.score >= 0)
    .sort((a, b) => b.score - a.score);
}

export function usePricechartingCards(entityName: string | null, game: Game | null) {
  return useQuery({
    queryKey: ['pricecharting-entity-cards', entityName, game],
    queryFn: async (): Promise<RankedPricechartingCard[]> => {
      if (!entityName || !game) return [];
      const category = GAME_CATEGORY[game];
      const searchTerm = entityName.toLowerCase().replace(/-/g, ' ');
      const { data, error } = await supabase
        .from('pricecharting_tcg_cards' as Parameters<typeof supabase.from>[0])
        .select('id, product_name, normalized_name, loose_price, graded_price')
        .eq('category', category)
        .ilike('normalized_name', `%${searchTerm}%`)
        .limit(100);
      if (error) throw error;
      return rankCards(searchTerm, (data ?? []) as RawPricechartingCard[]);
    },
    enabled: !!entityName && !!game,
    staleTime: 5 * 60_000,
  });
}

// ── Existing hooks (unchanged) ──────────────────────────────────────────────

export function useTargets(game: Game | null) {
  return useQuery({
    queryKey: ['targets', game],
    queryFn: async () => {
      if (!game) return [];
      const { data, error } = await supabase
        .from('tcg_targets')
        .select('*')
        .eq('game', game)
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as unknown as TcgTarget[];
    },
    enabled: !!game
  });
}

export function useTraits(game: Game | null) {
  return useQuery({
    queryKey: ['traits', game],
    queryFn: async () => {
      if (!game) return [];
      const { data, error } = await supabase
        .from('tcg_traits')
        .select('*')
        .eq('game', game)
        .order('weight', { ascending: false });
      if (error) throw error;
      return data as unknown as TcgTrait[];
    },
    enabled: !!game
  });
}

export function useSets(game: Game | null) {
  return useQuery({
    queryKey: ['sets', game],
    queryFn: async () => {
      if (!game) return [];
      const { data, error } = await supabase
        .from('tcg_sets')
        .select('*')
        .eq('game', game)
        .order('weight', { ascending: false });
      if (error) throw error;
      return data as unknown as TcgSet[];
    },
    enabled: !!game
  });
}

export function useTrendingTargets() {
  return useQuery({
    queryKey: ['trending-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tcg_targets')
        .select('*')
        .order('priority', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as unknown as TcgTarget[];
    }
  });
}
