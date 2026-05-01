import { queueNames, type JobResult } from "@cardscout/shared";

import type { QueueJobHandler } from "../context.js";

export const handleSlackAlertDispatch: QueueJobHandler<
  typeof queueNames.slackAlertDispatch
> = async (job, context): Promise<JobResult> => {
  const processedAt = new Date().toISOString();

  context.logger.info(
    {
      channel: job.data.channel,
      severity: job.data.severity ?? "info",
      webhookConfigured: Boolean(context.env.SLACK_WEBHOOK_URL),
    },
    "Processed Slack alert dispatch job",
  );

  await context.redis.lpush(
    "jobs:slack-alerts",
    JSON.stringify({
      channel: job.data.channel,
      message: job.data.message,
      severity: job.data.severity ?? "info",
      processedAt,
    }),
  );

  return {
    ok: true,
    message: `Dispatched Slack alert to ${job.data.channel}`,
    processedAt,
  };
};
