import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import type { JobPayloadByQueue, JobResult, WorkerQueueName } from "@cardscout/shared";

import { getEnv, type WorkerEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { getRedisClient } from "../lib/redis.js";
import { supabaseAdmin } from "../lib/supabase.js";

export type QueueJob<K extends WorkerQueueName = WorkerQueueName> = Job<
  JobPayloadByQueue[K],
  JobResult,
  K
>;

export type JobContext<K extends WorkerQueueName = WorkerQueueName> = {
  env: WorkerEnv;
  logger: Logger;
  supabase: SupabaseClient;
  redis: Redis;
  queueName: K;
  jobId: string;
};

export type QueueJobHandler<K extends WorkerQueueName> = (
  job: QueueJob<K>,
  context: JobContext<K>
) => Promise<JobResult>;

export const createJobContext = <K extends WorkerQueueName>(job: QueueJob<K>): JobContext<K> => {
  return {
    env: getEnv(),
    logger: logger.child({
      queueName: job.name,
      jobId: String(job.id ?? "unknown"),
      correlationId: job.data?.correlationId,
      attemptsMade: job.attemptsMade,
    }),
    redis: getRedisClient(),
    supabase: supabaseAdmin,
    queueName: job.name,
    jobId: String(job.id ?? "unknown"),
  };
};
