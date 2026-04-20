import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RulesetSnapshot } from '@/types/sportsQueryBuilder';

export function useSportsRulesetSnapshot() {
  return useQuery({
    queryKey: ['sports-ruleset-snapshot'],
    queryFn: async (): Promise<RulesetSnapshot> => {
      const { data, error } = await supabase.rpc('get_published_ruleset_snapshot' as Parameters<typeof supabase.rpc>[0]);
      if (error) throw error;
      const snapshot = data as unknown as RulesetSnapshot;
      return {
        ruleset: snapshot?.ruleset ?? null,
        sports: snapshot?.sports ?? [],
        players: snapshot?.players ?? [],
        rule_items: snapshot?.rule_items ?? [],
        seller_blacklist: snapshot?.seller_blacklist ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
