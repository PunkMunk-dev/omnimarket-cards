import { queueNames, type JobResult } from "@cardscout/shared";

import type { QueueJobHandler } from "../context.js";

export const handlePsaSpreadCalculation: QueueJobHandler<
  typeof queueNames.psaSpreadCalculation
> = async (job, context): Promise<JobResult> => {
  const processedAt = new Date().toISOString();
  const spread = job.data.gradeTarget === 9 ? 0.12 : 0.22;

  context.logger.info(
    {
      cardId: job.data.cardId,
      gradeTarget: job.data.gradeTarget ?? 10,
      source: job.data.source ?? "manual",
      spread,
    },
    "Processed PSA spread calculation job",
  );

  await context.redis.set(
    `jobs:psa-spread:${job.data.cardId}`,
    JSON.stringify({ spread, processedAt }),
    "EX",
    3600,
  );

  return {
    ok: true,
    message: `Calculated PSA spread for ${job.data.cardId}`,
    processedAt,
    metadata: { spread },
  };
};
