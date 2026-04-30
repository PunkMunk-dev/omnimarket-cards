import { Queue, QueueOptions, DefaultJobOptions } from "bullmq";
import { createRedisConnection } from "./redis.js";
import type { JobName } from "@omnimarket/shared";

const QUEUE_NAME = "omnimarket-jobs";

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 },
};

const queueOptions: QueueOptions = {
  connection: createRedisConnection(),
  defaultJobOptions,
};

let queueInstance: Queue | null = null;

export function getQueue(): Queue {
  if (queueInstance) return queueInstance;
  queueInstance = new Queue(QUEUE_NAME, queueOptions);
  return queueInstance;
}

export { QUEUE_NAME };

export async function enqueueJob<T>(
  jobName: JobName,
  payload: T,
  options?: { delay?: number; priority?: number; jobId?: string },
): Promise<void> {
  const queue = getQueue();
  await queue.add(jobName, payload, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId,
  });
}

export async function closeQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
}
