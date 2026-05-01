import { queueNames, type JobResult } from "@cardscout/shared";

import type { QueueJobHandler } from "../context.js";

export const handleOddsIngestion: QueueJobHandler<
  typeof queueNames.oddsIngestion
> = async (job, context): Promise<JobResult> => {
  const processedAt = new Date().toISOString();

  context.logger.info(
    {
      provider: job.data.provider,
      sport: job.data.sport,
      market: job.data.market,
    },
    "Processed odds ingestion job",
  );

  await context.redis.set(
    `jobs:odds:${job.data.provider}`,
    JSON.stringify({ sport: job.data.sport, market: job.data.market, processedAt }),
    "EX",
    1800,
  );

  return {
    ok: true,
    message: `Ingested odds from ${job.data.provider}`,
    processedAt,
  };
};
