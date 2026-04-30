import type { Job } from "bullmq";
import type { SlackAlertPayload, JobResult } from "@omnimarket/shared";
import { childLogger } from "../lib/logger.js";
import { env } from "../lib/env.js";

const log = childLogger({ job: "slack-alert-dispatch" });

const SEVERITY_EMOJI: Record<SlackAlertPayload["severity"], string> = {
  info: ":information_source:",
  warning: ":warning:",
  error: ":x:",
  critical: ":rotating_light:",
};

async function postToSlack(
  channel: string,
  text: string,
  blocks?: unknown[],
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  if (!env.SLACK_BOT_TOKEN && !env.SLACK_WEBHOOK_URL) {
    log.warn("No Slack credentials configured — skipping dispatch");
    return { ok: false, error: "no_credentials" };
  }

  if (env.SLACK_WEBHOOK_URL) {
    const resp = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });
    return { ok: resp.ok, error: resp.ok ? undefined : await resp.text() };
  }

  // Bot token via Web API
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  const json = (await resp.json()) as { ok: boolean; ts?: string; error?: string };
  return json;
}

export async function slackAlertDispatch(
  job: Job<SlackAlertPayload>,
): Promise<JobResult> {
  const { channel, message, severity, metadata } = job.data;
  const log2 = log.child({ channel, severity });
  log2.info({ message }, "Dispatching Slack alert");

  const emoji = SEVERITY_EMOJI[severity];
  const text = `${emoji} *[${severity.toUpperCase()}]* ${message}`;

  const blocks = [
    {
      type: "section",
      text: { type: "mrkdwn", text },
    },
  ];

  if (metadata && Object.keys(metadata).length > 0) {
    const metaText = Object.entries(metadata)
      .map(([k, v]) => `• *${k}:* ${JSON.stringify(v)}`)
      .join("\n");
    blocks.push({ type: "section", text: { type: "mrkdwn", text: metaText } });
  }

  (blocks as unknown[]).push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Posted at ${new Date().toISOString()}`,
      },
    ],
  });

  const result = await postToSlack(channel, text, blocks);

  if (!result.ok) {
    const errMsg = `Slack API error: ${result.error ?? "unknown"}`;
    log2.error({ error: result.error }, errMsg);
    if (result.error !== "no_credentials") {
      throw new Error(errMsg);
    }
  } else {
    log2.info({ ts: result.ts }, "Slack alert sent");
  }

  return {
    success: result.ok,
    message: result.ok
      ? `Alert dispatched to ${channel}`
      : `Alert skipped (${result.error})`,
    data: { channel, ts: result.ts },
    processedAt: new Date().toISOString(),
  };
}
