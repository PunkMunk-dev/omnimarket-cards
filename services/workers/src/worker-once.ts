/**
 * worker-once: enqueues a single job and waits for it to complete.
 * Useful for manual testing and one-off runs.
 *
 * Usage:
 *   JOB=ebay-saved-search-refresh JOB_PAYLOAD='{"savedSearchId":"abc","keywords":"charizard psa 10"}' \
 *     npm run worker:once
 */
import { Queue } from "bullmq";
import { createRedisConnection } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { QUEUE_NAME } from "./lib/queue.js";
import type { JobName } from "@omnimarket/shared";

const jobName = process.env["JOB"];
const payloadRaw = process.env["JOB_PAYLOAD"] ?? "{}";

if (!jobName) {
  logger.error("JOB environment variable is required");
  process.exit(1);
}

let payload: unknown;
try {
  payload = JSON.parse(payloadRaw);
} catch {
  logger.error({ payloadRaw }, "JOB_PAYLOAD is not valid JSON");
  process.exit(1);
}

async function main(): Promise<void> {
  const connection = createRedisConnection();
  const queue = new Queue(QUEUE_NAME, { connection });

  logger.info({ jobName, payload }, "Enqueuing one-off job");

  const job = await queue.add(jobName as JobName, payload, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  });

  logger.info({ jobId: job.id }, "Job enqueued — start the worker to process it");

  await queue.close();
  await connection.quit();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "worker-once failed");
  process.exit(1);
});
