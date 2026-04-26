export interface PricechartingResult {
  status: 'success';
  matchConfidence: 'high' | 'medium' | 'low';
  matchedProductName: string;
  consoleName?: string;
  rawMarketValue: number | null;    // dollars — PriceCharting loose_price
  psa9MarketValue: number | null;   // dollars — PriceCharting grade9_price (null if not in DB yet)
  psa10MarketValue: number | null;  // dollars — PriceCharting graded_price (PSA 10)
  estimatedProfit: number | null;   // psa10 - raw - $25 grading cost
  roiPercent: number | null;
  priceSource: 'pricecharting';
  pricecharting_id: number;         // numeric product ID — enables direct re-lookup on cache expiry
}
