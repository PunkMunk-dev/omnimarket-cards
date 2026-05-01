export const queueNames = {
  ebaySavedSearchRefresh: "ebay-saved-search-refresh",
  psaSpreadCalculation: "psa-spread-calculation",
  oddsIngestion: "odds-ingestion",
  evCalculation: "ev-calculation",
  leadScraping: "lead-scraping",
  slackAlertDispatch: "slack-alert-dispatch",
  deadLetter: "dead-letter-jobs",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];
export type WorkerQueueName = Exclude<QueueName, typeof queueNames.deadLetter>;

type BaseJobPayload = {
  correlationId?: string;
  requestedAt?: string;
};

export type EbaySavedSearchRefreshJob = BaseJobPayload & {
  userId: string;
  savedSearchId?: string;
  marketplace?: "EBAY_US" | "EBAY_UK" | "EBAY_AU";
};

export type PsaSpreadCalculationJob = BaseJobPayload & {
  cardId: string;
  gradeTarget?: 9 | 10;
  source?: "manual" | "nightly";
};

export type OddsIngestionJob = BaseJobPayload & {
  provider: "draftkings" | "fanduel" | "pinnacle";
  sport?: string;
  market?: string;
};

export type EvCalculationJob = BaseJobPayload & {
  eventId: string;
  strategy?: "value" | "arbitrage";
};

export type LeadScrapingJob = BaseJobPayload & {
  source: "ebay" | "instagram" | "x" | "facebook";
  query: string;
  maxResults?: number;
};

export type SlackAlertDispatchJob = BaseJobPayload & {
  channel: string;
  message: string;
  severity?: "info" | "warning" | "critical";
};

export type JobPayloadByQueue = {
  [queueNames.ebaySavedSearchRefresh]: EbaySavedSearchRefreshJob;
  [queueNames.psaSpreadCalculation]: PsaSpreadCalculationJob;
  [queueNames.oddsIngestion]: OddsIngestionJob;
  [queueNames.evCalculation]: EvCalculationJob;
  [queueNames.leadScraping]: LeadScrapingJob;
  [queueNames.slackAlertDispatch]: SlackAlertDispatchJob;
};

export type JobPayload = JobPayloadByQueue[WorkerQueueName];

export type JobResult = {
  ok: true;
  message: string;
  processedAt: string;
  metadata?: Record<string, unknown>;
};

export type DeadLetterPayload = {
  originalQueue: WorkerQueueName;
  originalJobId: string;
  attemptsMade: number;
  failedAt: string;
  errorMessage: string;
  payload: JobPayload;
};
