import { useState, useCallback, useMemo } from 'react';
import type { QueryBuilderState, MatchMode, RuleItem } from '@/types/sportsQueryBuilder';

const initialState: QueryBuilderState = {
  sport_key: null,
  selected_player_ids: [],
  selected_rule_item_ids: [],
  exclude_sellers: true,
  custom_excludes: [],
  player_match_mode: 'any',
  brand_match_mode: 'any',
  trait_match_mode: 'any',
  show_all_brands: false,
};

export function useSportsQueryBuilderState(ruleItems: RuleItem[] = []) {
  const [state, setState] = useState<QueryBuilderState>(initialState);

  const setSportKey = useCallback((sport_key: string | null) => {
    setState(prev => ({ ...prev, sport_key, selected_player_ids: [], selected_rule_item_ids: [], show_all_brands: false }));
  }, []);

  const selectPlayer = useCallback((playerId: string) => {
    setState(prev => ({
      ...prev,
      selected_player_ids: [playerId],
      show_all_brands: prev.show_all_brands || prev.selected_rule_item_ids.length === 0,
    }));
  }, []);

  const selectBrand = useCallback((brandId: string) => {
    setState(prev => {
      const currentTraitIds = prev.selected_rule_item_ids.filter(id => {
        const item = ruleItems.find(ri => ri.id === id);
        return item && item.kind !== 'brand';
      });
      const compatibleTraitIds = currentTraitIds.filter(id => {
        const item = ruleItems.find(ri => ri.id === id);
        if (!item) return false;
        const compat = item.compatible_brand_ids ?? [];
        return compat.length === 0 || compat.includes(brandId);
      });
      return { ...prev, selected_rule_item_ids: [brandId, ...compatibleTraitIds], show_all_brands: false };
    });
  }, [ruleItems]);

  const setShowAllBrands = useCallback((showAll: boolean) => {
    setState(prev => {
      if (showAll) {
        const traitIds = prev.selected_rule_item_ids.filter(id => { const item = ruleItems.find(ri => ri.id === id); return item && item.kind !== 'brand'; });
        return { ...prev, selected_rule_item_ids: traitIds, show_all_brands: true };
      }
      return { ...prev, show_all_brands: false };
    });
  }, [ruleItems]);

  const toggleTrait = useCallback((traitId: string) => {
    setState(prev => ({
      ...prev,
      selected_rule_item_ids: prev.selected_rule_item_ids.includes(traitId)
        ? prev.selected_rule_item_ids.filter(id => id !== traitId)
        : [...prev.selected_rule_item_ids, traitId],
    }));
  }, []);

  const clearTraits = useCallback(() => {
    setState(prev => ({
      ...prev,
      selected_rule_item_ids: prev.selected_rule_item_ids.filter(id => { const item = ruleItems.find(ri => ri.id === id); return item && item.kind !== 'trait'; }),
    }));
  }, [ruleItems]);

  const reset = useCallback(() => setState(initialState), []);

  const actions = useMemo(() => ({ setSportKey, selectPlayer, selectBrand, setShowAllBrands, toggleTrait, clearTraits, reset }), [setSportKey, selectPlayer, selectBrand, setShowAllBrands, toggleTrait, clearTraits, reset]);
  return { state, ...actions };
}
