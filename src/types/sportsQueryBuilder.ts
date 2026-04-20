export interface RulesetInfo {
  id: string;
  name: string;
  version: string;
  published_at: string | null;
}

export interface Sport {
  key: string;
  label: string;
  sort_order: number;
}

export interface Player {
  id: string;
  sport_key: string;
  name: string;
  note: string | null;
  tags: string[];
  sort_order: number;
}

export interface RuleItem {
  id: string;
  sport_key: string;
  kind: 'brand' | 'trait' | 'note' | 'resource';
  label: string;
  tokens: string[];
  priority: number;
  is_default: boolean;
  url: string | null;
  compatible_brand_ids: string[];
}

export interface SellerBlacklistEntry {
  id: string;
  pattern: string;
  label: string | null;
  priority: number;
  is_active: boolean;
}

export interface RulesetSnapshot {
  ruleset: RulesetInfo | null;
  sports: Sport[];
  players: Player[];
  rule_items: RuleItem[];
  seller_blacklist: SellerBlacklistEntry[];
}

export type MatchMode = 'any' | 'all';

export interface QueryBuilderState {
  sport_key: string | null;
  selected_player_ids: string[];
  selected_rule_item_ids: string[];
  exclude_sellers: boolean;
  custom_excludes: string[];
  player_match_mode: MatchMode;
  brand_match_mode: MatchMode;
  trait_match_mode: MatchMode;
  show_all_brands: boolean;
}
