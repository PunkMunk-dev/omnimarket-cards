import { getEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { closeRedisConnections } from "../lib/redis.js";
import { closeQueues } from "../queues/registry.js";
import { registerSchedulers } from "../scheduler/register.js";

const env = getEnv();
const appLogger = logger.child({ module: "scheduler-entrypoint" });

const main = async (): Promise<void> => {
  const schedules = await registerSchedulers(env);
  appLogger.info({ scheduleCount: schedules.length }, "Scheduler registration complete");
};

main()
  .catch((error) => {
    appLogger.error({ error }, "Scheduler registration failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeQueues();
    await closeRedisConnections();
  });
