import { Queue } from "bullmq";
import { queueNames, type DeadLetterPayload, type JobPayloadByQueue, type WorkerQueueName } from "@cardscout/shared";

import { queueConnection } from "./connection.js";
import { defaultJobOptions } from "./options.js";
import { workerQueueNames } from "./names.js";

type WorkerQueueMap = {
  [K in WorkerQueueName]: Queue<JobPayloadByQueue[K]>;
};

const createWorkerQueue = <K extends WorkerQueueName>(queueName: K): Queue<JobPayloadByQueue[K]> =>
  new Queue<JobPayloadByQueue[K]>(queueName, {
    connection: queueConnection,
    defaultJobOptions,
  });

export const workerQueues = workerQueueNames.reduce((acc, queueName) => {
  acc[queueName] = createWorkerQueue(queueName);
  return acc;
}, {} as WorkerQueueMap);

export const deadLetterQueue = new Queue<DeadLetterPayload>(queueNames.deadLetter, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const closeQueues = async (): Promise<void> => {
  await Promise.all([
    ...Object.values(workerQueues).map((queue) => queue.close()),
    deadLetterQueue.close(),
  ]);
};
