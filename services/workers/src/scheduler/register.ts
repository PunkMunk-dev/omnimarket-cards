import type { WorkerQueueName } from "@cardscout/shared";

import type { WorkerEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { workerQueues } from "../queues/registry.js";
import { scheduleDefinitions } from "./definitions.js";

const schedulerLogger = logger.child({ module: "scheduler" });

export type SchedulerRegistration = {
  queueName: WorkerQueueName;
  schedulerId: string;
  cron: string;
};

export const registerSchedulers = async (env: WorkerEnv): Promise<SchedulerRegistration[]> => {
  if (!env.SCHEDULER_ENABLED) {
    schedulerLogger.info("Scheduler disabled via env");
    return [];
  }

  const registrations: SchedulerRegistration[] = [];
  for (const definition of scheduleDefinitions) {
    const queue = workerQueues[definition.queueName];
    const cron = definition.cron(env);

    const result = await queue.upsertJobScheduler(
      `schedule:${definition.queueName}`,
      { pattern: cron },
      {
        name: definition.queueName,
        data: definition.payload(env),
        opts: {
          jobId: `schedule-job:${definition.queueName}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    );

    const registration: SchedulerRegistration = {
      queueName: definition.queueName,
      schedulerId:
        typeof result === "object" && result !== null && "key" in result
          ? String(result.key)
          : "unknown",
      cron,
    };
    registrations.push(registration);
    schedulerLogger.info(registration, "Registered scheduler");
  }

  return registrations;
};
