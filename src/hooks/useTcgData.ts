import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TcgTarget, TcgTrait, TcgSet, Game } from '@/types/tcg';

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
