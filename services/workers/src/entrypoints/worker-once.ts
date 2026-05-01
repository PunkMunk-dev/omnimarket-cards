import { randomUUID } from "node:crypto";

import { queueNames, type JobPayloadByQueue, type WorkerQueueName } from "@cardscout/shared";

import { logger } from "../lib/logger.js";
import { closeRedisConnections } from "../lib/redis.js";
import { closeQueues, workerQueues } from "../queues/registry.js";

const selectedQueue = (process.argv[2] ?? queueNames.evCalculation) as WorkerQueueName;
const onceLogger = logger.child({ module: "worker-once" });

const payloadByQueue: { [K in WorkerQueueName]: JobPayloadByQueue[K] } = {
  [queueNames.ebaySavedSearchRefresh]: {
    userId: "system",
    marketplace: "EBAY_US",
  },
  [queueNames.psaSpreadCalculation]: {
    cardId: "demo-card",
    gradeTarget: 10,
    source: "manual",
  },
  [queueNames.oddsIngestion]: {
    provider: "draftkings",
    sport: "mlb",
    market: "moneyline",
  },
  [queueNames.evCalculation]: {
    eventId: "demo-event",
    strategy: "value",
  },
  [queueNames.leadScraping]: {
    source: "ebay",
    query: "rookie auto psa 10",
    maxResults: 20,
  },
  [queueNames.slackAlertDispatch]: {
    channel: "#alerts",
    message: "Manual worker once job",
    severity: "info",
  },
};

const main = async (): Promise<void> => {
  const queue = workerQueues[selectedQueue];
  if (!queue) {
    throw new Error(`Unknown queue name: ${selectedQueue}`);
  }

  const correlationId = randomUUID();
  const job = await queue.add(
    selectedQueue,
    {
      ...payloadByQueue[selectedQueue],
      correlationId,
      requestedAt: new Date().toISOString(),
    },
    {
      attempts: 1,
    },
  );

  onceLogger.info(
    {
      queueName: selectedQueue,
      jobId: job.id,
      correlationId,
    },
    "Enqueued one-off job",
  );
};

main()
  .catch((error) => {
    onceLogger.error({ error }, "Failed to enqueue one-off job");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeQueues();
    await closeRedisConnections();
  });
