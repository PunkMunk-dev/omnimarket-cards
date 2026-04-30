export interface EbayListing {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  listingUrl: string;
  imageUrl?: string;
  endTime?: string;
  soldDate?: string;
  shippingCost?: number;
  totalPrice?: number;
}

export interface EbaySavedSearch {
  id: string;
  userId: string;
  keywords: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  conditionIds?: string[];
  lastRefreshedAt?: string;
  createdAt: string;
}

export interface EbayRefreshResult {
  savedSearchId: string;
  newListingsCount: number;
  totalListingsFound: number;
  listings: EbayListing[];
}
