export type JobName =
  | "ebay-saved-search-refresh"
  | "psa-spread-calculation"
  | "odds-ingestion"
  | "ev-calculation"
  | "lead-scraping"
  | "slack-alert-dispatch";

export interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processedAt: string;
}

export interface JobMeta {
  jobName: JobName;
  triggeredBy: "scheduler" | "manual" | "event";
  correlationId?: string;
}

export interface EbaySavedSearchPayload {
  savedSearchId: string;
  userId?: string;
  keywords: string;
  categoryId?: string;
  maxPrice?: number;
  minPrice?: number;
}

export interface PsaSpreadPayload {
  cardId: string;
  gradeFrom: number;
  gradeTo: number;
  sport?: string;
}

export interface OddsIngestionPayload {
  sportKey: string;
  markets: string[];
  regions: string[];
}

export interface EvCalculationPayload {
  eventId: string;
  sportKey: string;
  bookmakers: string[];
}

export interface LeadScrapingPayload {
  source: "facebook" | "craigslist" | "offerup" | "mercari";
  keywords: string[];
  location?: string;
  maxResults?: number;
}

export interface SlackAlertPayload {
  channel: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  metadata?: Record<string, unknown>;
}
