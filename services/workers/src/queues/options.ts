import type { JobsOptions, WorkerOptions } from "bullmq";

import { getEnv } from "../config/env.js";

const env = getEnv();

const backoffDelay = (attemptsMade: number): number => {
  const delay = env.DEFAULT_BACKOFF_MS * 2 ** Math.max(0, attemptsMade - 1);
  return Math.min(delay, env.MAX_BACKOFF_MS);
};

export const defaultJobOptions: JobsOptions = {
  attempts: env.DEFAULT_JOB_ATTEMPTS,
  removeOnComplete: 1000,
  removeOnFail: false,
  backoff: {
    type: "exponential",
    delay: env.DEFAULT_BACKOFF_MS,
  },
};

export const workerOptions: Pick<WorkerOptions, "concurrency" | "settings"> = {
  concurrency: env.WORKER_CONCURRENCY,
  settings: {
    backoffStrategy: (attemptsMade: number) => backoffDelay(attemptsMade + 1),
  },
};
