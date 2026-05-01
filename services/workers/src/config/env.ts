import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  REDIS_URL: z.string().url(),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  DEFAULT_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  DEFAULT_BACKOFF_MS: z.coerce.number().int().min(250).default(5000),
  MAX_BACKOFF_MS: z.coerce.number().int().min(1000).default(120000),
  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_EBAY_REFRESH_CRON: z.string().default("*/20 * * * *"),
  SCHEDULER_PSA_SPREAD_CRON: z.string().default("*/30 * * * *"),
  SCHEDULER_ODDS_INGESTION_CRON: z.string().default("*/10 * * * *"),
  SCHEDULER_EV_CALCULATION_CRON: z.string().default("*/15 * * * *"),
  SCHEDULER_LEAD_SCRAPING_CRON: z.string().default("0 * * * *"),
  SCHEDULER_SLACK_ALERT_CRON: z.string().default("*/5 * * * *"),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
});

export type WorkerEnv = z.infer<typeof envSchema>;

let cachedEnv: WorkerEnv | undefined;

export const getEnv = (): WorkerEnv => {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
};
