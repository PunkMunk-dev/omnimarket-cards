/**
 * Main worker entrypoint — starts a BullMQ Worker that processes all queued jobs.
 * Run via: npm run worker:start (production) or npm run dev:worker (development)
 */
import { Worker, UnrecoverableError } from "bullmq";
import type { Job } from "bullmq";
import type { JobName, JobResult } from "@omnimarket/shared";
import { createRedisConnection } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { env } from "./lib/env.js";
import { QUEUE_NAME } from "./lib/queue.js";
import { ebaySavedSearchRefresh } from "./jobs/ebay-saved-search-refresh.js";
import { psaSpreadCalculation } from "./jobs/psa-spread-calculation.js";
import { oddsIngestion } from "./jobs/odds-ingestion.js";
import { evCalculation } from "./jobs/ev-calculation.js";
import { leadScraping } from "./jobs/lead-scraping.js";
import { slackAlertDispatch } from "./jobs/slack-alert-dispatch.js";

const UNRECOVERABLE_ERRORS = [
  "Invalid environment variables",
  "DB upsert failed",
];

async function processJob(job: Job): Promise<JobResult> {
  const jobName = job.name as JobName;
  const log = logger.child({ jobId: job.id, jobName, attempt: job.attemptsMade });
  log.info("Processing job");

  switch (jobName) {
    case "ebay-saved-search-refresh":
      return ebaySavedSearchRefresh(job);
    case "psa-spread-calculation":
      return psaSpreadCalculation(job);
    case "odds-ingestion":
      return oddsIngestion(job);
    case "ev-calculation":
      return evCalculation(job);
    case "lead-scraping":
      return leadScraping(job);
    case "slack-alert-dispatch":
      return slackAlertDispatch(job);
    default:
      throw new UnrecoverableError(`Unknown job name: ${jobName}`);
  }
}

function isUnrecoverable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return UNRECOVERABLE_ERRORS.some((e) => message.includes(e));
}

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    try {
      return await processJob(job);
    } catch (err) {
      if (isUnrecoverable(err)) {
        throw new UnrecoverableError(
          err instanceof Error ? err.message : String(err),
        );
      }
      throw err;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: env.WORKER_CONCURRENCY,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
);

worker.on("completed", (job, result) => {
  logger.info(
    { jobId: job.id, jobName: job.name, result },
    "Job completed",
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      jobName: job?.name,
      attempt: job?.attemptsMade,
      err,
    },
    "Job failed",
  );
});

worker.on("error", (err) => {
  logger.error({ err }, "Worker error");
});

worker.on("stalled", (jobId) => {
  logger.warn({ jobId }, "Job stalled");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Received shutdown signal, draining worker...");
  await worker.close();
  logger.info("Worker shut down gracefully");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

logger.info(
  { queue: QUEUE_NAME, concurrency: env.WORKER_CONCURRENCY },
  "Worker started",
);
