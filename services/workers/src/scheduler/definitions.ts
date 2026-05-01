import { queueNames, type JobPayloadByQueue, type WorkerQueueName } from "@cardscout/shared";

import type { WorkerEnv } from "../config/env.js";

export type ScheduleDefinition<K extends WorkerQueueName = WorkerQueueName> = {
  queueName: K;
  cron: (env: WorkerEnv) => string;
  payload: (env: WorkerEnv) => JobPayloadByQueue[K];
};

export const scheduleDefinitions: ScheduleDefinition[] = [
  {
    queueName: queueNames.ebaySavedSearchRefresh,
    cron: (env) => env.SCHEDULER_EBAY_REFRESH_CRON,
    payload: () => ({
      userId: "system",
      marketplace: "EBAY_US",
      correlationId: "schedule-ebay-refresh",
      requestedAt: new Date().toISOString(),
    }),
  },
  {
    queueName: queueNames.psaSpreadCalculation,
    cron: (env) => env.SCHEDULER_PSA_SPREAD_CRON,
    payload: () => ({
      cardId: "daily-index",
      gradeTarget: 10,
      source: "nightly",
      correlationId: "schedule-psa-spread",
      requestedAt: new Date().toISOString(),
    }),
  },
  {
    queueName: queueNames.oddsIngestion,
    cron: (env) => env.SCHEDULER_ODDS_INGESTION_CRON,
    payload: () => ({
      provider: "draftkings",
      sport: "mlb",
      market: "moneyline",
      correlationId: "schedule-odds-ingestion",
      requestedAt: new Date().toISOString(),
    }),
  },
  {
    queueName: queueNames.evCalculation,
    cron: (env) => env.SCHEDULER_EV_CALCULATION_CRON,
    payload: () => ({
      eventId: "daily-ev-scan",
      strategy: "value",
      correlationId: "schedule-ev-calculation",
      requestedAt: new Date().toISOString(),
    }),
  },
  {
    queueName: queueNames.leadScraping,
    cron: (env) => env.SCHEDULER_LEAD_SCRAPING_CRON,
    payload: () => ({
      source: "ebay",
      query: "rookie auto psa 10",
      maxResults: 20,
      correlationId: "schedule-lead-scraping",
      requestedAt: new Date().toISOString(),
    }),
  },
  {
    queueName: queueNames.slackAlertDispatch,
    cron: (env) => env.SCHEDULER_SLACK_ALERT_CRON,
    payload: () => ({
      channel: "#alerts",
      message: "Scheduled platform heartbeat",
      severity: "info",
      correlationId: "schedule-slack-alert",
      requestedAt: new Date().toISOString(),
    }),
  },
];
