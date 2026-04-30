/**
 * Scheduler — sets up BullMQ repeatable (cron) jobs.
 * Run via: npm run worker:scheduler
 *
 * This process only registers the schedules and exits.
 * The main worker process (worker.ts) processes the jobs.
 */
import { getQueue, closeQueue } from "./lib/queue.js";
import { logger } from "./lib/logger.js";
import type { EbaySavedSearchPayload, OddsIngestionPayload } from "@omnimarket/shared";

interface ScheduledJob<T = unknown> {
  name: string;
  payload: T;
  cron: string;
  description: string;
}

const scheduledJobs: ScheduledJob[] = [
  {
    name: "ebay-saved-search-refresh",
    payload: {
      savedSearchId: "all",
      keywords: "charizard psa 10",
      categoryId: "2536",
    } satisfies EbaySavedSearchPayload,
    cron: "*/15 * * * *", // every 15 minutes
    description: "Refresh all eBay saved searches",
  },
  {
    name: "odds-ingestion",
    payload: {
      sportKey: "americanfootball_nfl",
      markets: ["h2h", "spreads", "totals"],
      regions: ["us", "us2"],
    } satisfies OddsIngestionPayload,
    cron: "0 * * * *", // every hour
    description: "Ingest NFL odds",
  },
  {
    name: "odds-ingestion",
    payload: {
      sportKey: "basketball_nba",
      markets: ["h2h", "spreads", "totals"],
      regions: ["us", "us2"],
    } satisfies OddsIngestionPayload,
    cron: "5 * * * *", // every hour at :05
    description: "Ingest NBA odds",
  },
  {
    name: "lead-scraping",
    payload: {
      source: "craigslist",
      keywords: ["pokemon cards lot", "sports cards collection", "graded cards"],
      maxResults: 50,
    },
    cron: "0 */6 * * *", // every 6 hours
    description: "Scrape Craigslist for card leads",
  },
  {
    name: "lead-scraping",
    payload: {
      source: "offerup",
      keywords: ["pokemon cards", "baseball cards", "basketball rookie"],
      maxResults: 50,
    },
    cron: "30 */6 * * *", // every 6 hours at :30
    description: "Scrape OfferUp for card leads",
  },
];

async function registerSchedules(): Promise<void> {
  const queue = getQueue();

  // Remove existing repeatable jobs to allow updates
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    logger.info({ jobKey: job.key }, "Removing existing repeatable job");
    await queue.removeRepeatableByKey(job.key);
  }

  for (const scheduled of scheduledJobs) {
    await queue.add(scheduled.name, scheduled.payload, {
      repeat: { pattern: scheduled.cron },
      jobId: `scheduled:${scheduled.name}:${scheduled.cron.replace(/\s/g, "-")}`,
    });
    logger.info(
      { job: scheduled.name, cron: scheduled.cron, description: scheduled.description },
      "Registered scheduled job",
    );
  }

  logger.info({ count: scheduledJobs.length }, "All scheduled jobs registered");
}

registerSchedules()
  .then(() => closeQueue())
  .then(() => {
    logger.info("Scheduler complete");
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, "Scheduler failed");
    process.exit(1);
  });
