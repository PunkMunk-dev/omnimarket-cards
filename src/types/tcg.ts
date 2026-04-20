export type Game = 'pokemon' | 'one_piece';
export type RarityTier = 'legendary' | 'ultra_rare' | 'rare' | 'holo' | 'common';
export type Region = 'english' | 'japanese';

export interface TcgTarget {
  id: string;
  game: Game;
  name: string;
  priority: number;
  tags: string | null;
  created_at: string;
}

export interface TcgTrait {
  id: string;
  game: Game;
  trait: string;
  search_terms: string;
  weight: number;
  rarity_tier: string | null;
  created_at: string;
}

export interface TcgSet {
  id: string;
  game: Game;
  set_name: string;
  weight: number;
  created_at: string;
}

export interface TcgRecommendation {
  id: string;
  game: Game;
  target_name: string;
  recommended_query: string;
  trait: string | null;
  set_hint: string | null;
  score: number;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  game: Game;
  query: string;
  listing_id: string | null;
  listing_title: string | null;
  listing_price: string | null;
  listing_image: string | null;
  created_at: string;
}

export interface EbayListing {
  itemId: string;
  title: string;
  price: {
    value: string;
    currency: string;
  };
  image: string;
  condition: string;
  listingType: 'FIXED_PRICE' | 'AUCTION';
  itemWebUrl: string;
  shipping?: {
    cost: string;
    type: string;
  };
  timeRemaining?: string;
  watchCount?: number;
  bidCount?: number;
}

export interface EbaySoldItem {
  itemId: string;
  title: string;
  soldPrice: {
    value: string;
    currency: string;
  };
  soldDate: string;
  image: string;
  itemWebUrl: string;
}

export interface DemandMetrics {
  salesLast7Days: number;
  mostRecentSale: string | null;
  medianSoldPrice: string | null;
  recentSales: EbaySoldItem[];
  isProxy: boolean;
}

export interface SearchFilters {
  sort: 'best_match' | 'price_low' | 'price_high' | 'newly_listed' | 'ending_soonest';
  excludeLots: boolean;
  excludeSealed: boolean;
  rawOnly: boolean;
  minPrice: number;
  maxPrice: number;
  cardType?: 'single' | 'slabbed' | 'sealed' | 'packs';
  buyingOptions?: 'AUCTION' | 'FIXED_PRICE' | 'ALL';
}
