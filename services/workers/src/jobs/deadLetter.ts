import type { Job } from "bullmq";
import type { DeadLetterPayload, JobPayloadByQueue, JobResult, WorkerQueueName } from "@cardscout/shared";

import { deadLetterQueue } from "../queues/registry.js";

export const publishDeadLetter = async (
  job: Job<JobPayloadByQueue[WorkerQueueName], JobResult, WorkerQueueName>,
  error: unknown,
): Promise<void> => {
  const payload: DeadLetterPayload = {
    originalQueue: job.name,
    originalJobId: String(job.id ?? "unknown"),
    attemptsMade: job.attemptsMade,
    failedAt: new Date().toISOString(),
    errorMessage: error instanceof Error ? error.message : "Unknown job failure",
    payload: job.data,
  };

  await deadLetterQueue.add(`dlq:${job.name}`, payload, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 1,
  });
};
