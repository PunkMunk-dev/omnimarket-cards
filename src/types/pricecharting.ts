export interface PricechartingResult {
  status: 'success';
  matchConfidence: 'high' | 'medium' | 'low';
  matchedProductName: string;
  consoleName?: string;
  rawMarketValue: number | null;   // dollars
  psa10MarketValue: number | null; // dollars
  estimatedProfit: number | null;  // market spread: psa10 - raw - $25
  roiPercent: number | null;
  priceSource: 'pricecharting';
}
