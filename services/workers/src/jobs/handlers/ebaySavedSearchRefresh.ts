import { queueNames, type JobResult } from "@cardscout/shared";

import type { QueueJobHandler } from "../context.js";

export const handleEbaySavedSearchRefresh: QueueJobHandler<
  typeof queueNames.ebaySavedSearchRefresh
> = async (job, context): Promise<JobResult> => {
  const processedAt = new Date().toISOString();

  context.logger.info(
    {
      userId: job.data.userId,
      savedSearchId: job.data.savedSearchId,
      marketplace: job.data.marketplace ?? "EBAY_US",
    },
    "Processed ebay saved-search refresh job",
  );

  await context.redis.set(
    `jobs:ebay-refresh:${job.data.userId}`,
    JSON.stringify({
      savedSearchId: job.data.savedSearchId,
      processedAt,
    }),
    "EX",
    3600,
  );

  return {
    ok: true,
    message: `Refreshed saved search for user ${job.data.userId}`,
    processedAt,
  };
};
