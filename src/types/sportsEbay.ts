export interface Psa10SoldComp {
  price: number;
  soldDate: string | null;
  ebayUrl: string;
  title: string;
}

export interface EbayListing {
  itemId: string;
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  itemWebUrl: string;
  condition: string | null;
  seller: string | null;
  shippingCost: number | null;
  buyingOptions: string[];
  listingDate: string | null;
  itemEndDate?: string | null;
  currentBidPrice?: number | null;
  bidCount?: number | null;
  psa10MarketValue?: number | null;
  psa10MarketValueConfidence?: 'high' | 'medium' | 'low' | null;
  psa10SoldComps?: Psa10SoldComp[];
  searchContext?: {
    playerName: string;
    brand?: string;
    year?: string;
    traits?: string[];
  };
  imageQualityScore?: number;
  additionalImageCount?: number;
}

export type SortOption = 'newest' | 'price-high' | 'price-low' | 'profit-high' | 'psa10-high' | 'quality-high' | 'ending-soon';

export interface EbaySearchParams {
  playerName: string;
  brand?: string;
  traits?: string[];
  year?: string;
  freeFormSearch?: boolean;
  offset?: number;
}

export interface EbaySearchResponse {
  success: boolean;
  listings: EbayListing[];
  count: number;
  error?: string;
  hasMore?: boolean;
  nextOffset?: number;
  totalResults?: number;
}

export interface Psa10PriceResponse {
  success: boolean;
  marketValue: number | null;
  marketValueConfidence: 'high' | 'medium' | 'low' | null;
  soldComps: Psa10SoldComp[];
  soldCount: number;
  avgPrice: number | null;
  lastSoldDate: string | null;
  error?: string;
}

export interface Psa10ActiveListing {
  price: number;
  title: string;
  ebayUrl: string;
  imageUrl: string | null;
}

export interface Psa10ActiveResponse {
  success: boolean;
  marketValue: number | null;
  activeListings: Psa10ActiveListing[];
  listingCount: number;
  error?: string;
}

export interface PopData {
  psa10Pop: number;
  totalPsaPop: number;
  gemRatePct: number;
}

export interface GemRateResponse {
  success: boolean;
  gemRate: number | null;
  psa10Pop: number | null;
  totalPsaPop: number | null;
  psa10Url: string | null;
  error?: string;
}
