import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TcgTarget, TcgTrait, TcgSet, Game } from '@/types/tcg';

const GAME_CATEGORY: Record<Game, string> = {
  pokemon: 'pokemon',
  one_piece: 'onepiece',
};

function cleanProductName(raw: string): string {
  return raw
    .replace(/#\d+/g, '')
    .replace(/\b(psa|bgs|cgc|sgc)\s*\d+(\.\d+)?\b/gi, '')
    .replace(/\b(graded|ungraded|mint|nm-m|nm|raw)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useTcgCardNames(game: Game | null, search: string) {
  return useQuery({
    queryKey: ['tcg-card-names', game, search],
    queryFn: async (): Promise<Array<{ id: string; label: string }>> => {
      if (!game) return [];
      const category = GAME_CATEGORY[game];
      let query = supabase
        .from('pricecharting_tcg_cards' as Parameters<typeof supabase.from>[0])
        .select('product_name')
        .eq('category', category)
        .limit(100);
      if (search.trim().length >= 2) {
        query = (query as ReturnType<typeof supabase.from>).ilike('product_name', `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const seen = new Set<string>();
      const results: Array<{ id: string; label: string }> = [];
      for (const row of (data ?? []) as Array<{ product_name: string }>) {
        const cleaned = cleanProductName(row.product_name);
        if (!cleaned || seen.has(cleaned)) continue;
        seen.add(cleaned);
        results.push({ id: cleaned, label: cleaned });
      }
      return results;
    },
    enabled: !!game,
    staleTime: 5 * 60_000,
  });
}

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
