import { Worker } from "bullmq";
import type { JobPayloadByQueue, JobResult } from "@cardscout/shared";

import { getEnv } from "../config/env.js";
import { createJobContext } from "../jobs/context.js";
import { publishDeadLetter } from "../jobs/deadLetter.js";
import { processJob } from "../jobs/router.js";
import { logger } from "../lib/logger.js";
import { closeRedisConnections } from "../lib/redis.js";
import { queueConnection } from "../queues/connection.js";
import { workerQueueNames } from "../queues/names.js";
import { workerOptions } from "../queues/options.js";
import { closeQueues } from "../queues/registry.js";

const env = getEnv();
const appLogger = logger.child({ module: "worker-entrypoint" });

const workers = workerQueueNames.map((queueName) => {
  const worker = new Worker<JobPayloadByQueue[typeof queueName], JobResult, typeof queueName>(
    queueName,
    async (job) => processJob(job, createJobContext(job)),
    {
      connection: queueConnection,
      ...workerOptions,
    },
  );

  worker.on("ready", () => {
    appLogger.info({ queueName }, "Worker ready");
  });

  worker.on("completed", (job, result) => {
    appLogger.info({ queueName, jobId: job.id, result }, "Job completed");
  });

  worker.on("failed", async (job, error) => {
    appLogger.error(
      {
        queueName,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        attemptsAllowed: job?.opts.attempts,
        error,
      },
      "Job failed",
    );

    if (job && typeof job.opts.attempts === "number" && job.attemptsMade >= job.opts.attempts) {
      await publishDeadLetter(job, error);
    }
  });

  return worker;
});

appLogger.info(
  {
    queueCount: workers.length,
    concurrency: env.WORKER_CONCURRENCY,
  },
  "Worker service started",
);

let shuttingDown = false;
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  appLogger.info({ signal }, "Graceful shutdown started");

  const closeWorkers = Promise.all(workers.map((worker) => worker.close()));
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, env.WORKER_SHUTDOWN_TIMEOUT_MS);
  });

  await Promise.race([closeWorkers, timeout]);
  await closeQueues();
  await closeRedisConnections();

  appLogger.info("Graceful shutdown complete");
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
