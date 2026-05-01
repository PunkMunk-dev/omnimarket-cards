import { queueNames, type JobResult } from "@cardscout/shared";

import type { QueueJobHandler } from "../context.js";

export const handleEvCalculation: QueueJobHandler<
  typeof queueNames.evCalculation
> = async (job, context): Promise<JobResult> => {
  const processedAt = new Date().toISOString();
  const expectedValue = job.data.strategy === "arbitrage" ? 0.06 : 0.035;

  context.logger.info(
    {
      eventId: job.data.eventId,
      strategy: job.data.strategy ?? "value",
      expectedValue,
    },
    "Processed EV calculation job",
  );

  await context.redis.set(
    `jobs:ev:${job.data.eventId}`,
    JSON.stringify({ expectedValue, processedAt }),
    "EX",
    3600,
  );

  return {
    ok: true,
    message: `Calculated EV for ${job.data.eventId}`,
    processedAt,
    metadata: { expectedValue },
  };
};
