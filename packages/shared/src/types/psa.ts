export interface PsaGrade {
  grade: number;
  label: string;
  description?: string;
}

export interface PsaCardSale {
  cardId: string;
  grade: number;
  salePrice: number;
  saleDate: string;
  source: string;
}

export interface PsaSpread {
  cardId: string;
  gradeFrom: number;
  gradeTo: number;
  avgPriceFrom: number;
  avgPriceTo: number;
  spreadAmount: number;
  spreadPercent: number;
  roiEstimate: number;
  sampleSizeFrom: number;
  sampleSizeTo: number;
  calculatedAt: string;
}

export interface GemRateResult {
  cardId: string;
  totalGraded: number;
  psa10Count: number;
  gemRate: number;
  calculatedAt: string;
}
