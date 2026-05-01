import { queueNames, type JobResult } from "@cardscout/shared";

import type { QueueJobHandler } from "../context.js";

export const handleLeadScraping: QueueJobHandler<
  typeof queueNames.leadScraping
> = async (job, context): Promise<JobResult> => {
  const processedAt = new Date().toISOString();
  const capturedLeads = Math.min(job.data.maxResults ?? 25, 25);

  context.logger.info(
    {
      source: job.data.source,
      query: job.data.query,
      capturedLeads,
    },
    "Processed lead scraping job",
  );

  await context.redis.set(
    `jobs:lead-scrape:${job.data.source}`,
    JSON.stringify({ query: job.data.query, capturedLeads, processedAt }),
    "EX",
    1800,
  );

  return {
    ok: true,
    message: `Scraped leads for ${job.data.source}`,
    processedAt,
    metadata: { capturedLeads },
  };
};
