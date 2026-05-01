import { queueNames, type JobResult, type WorkerQueueName } from "@cardscout/shared";

import type { JobContext, QueueJob, QueueJobHandler } from "./context.js";
import {
  handleEbaySavedSearchRefresh,
  handleEvCalculation,
  handleLeadScraping,
  handleOddsIngestion,
  handlePsaSpreadCalculation,
  handleSlackAlertDispatch,
} from "./handlers/index.js";

const handlers: { [K in WorkerQueueName]: QueueJobHandler<K> } = {
  [queueNames.ebaySavedSearchRefresh]: handleEbaySavedSearchRefresh,
  [queueNames.psaSpreadCalculation]: handlePsaSpreadCalculation,
  [queueNames.oddsIngestion]: handleOddsIngestion,
  [queueNames.evCalculation]: handleEvCalculation,
  [queueNames.leadScraping]: handleLeadScraping,
  [queueNames.slackAlertDispatch]: handleSlackAlertDispatch,
};

export const processJob = async (
  job: QueueJob<WorkerQueueName>,
  context: JobContext<WorkerQueueName>,
): Promise<JobResult> => {
  switch (job.name) {
    case queueNames.ebaySavedSearchRefresh:
      return handlers[queueNames.ebaySavedSearchRefresh](job, context);
    case queueNames.psaSpreadCalculation:
      return handlers[queueNames.psaSpreadCalculation](job, context);
    case queueNames.oddsIngestion:
      return handlers[queueNames.oddsIngestion](job, context);
    case queueNames.evCalculation:
      return handlers[queueNames.evCalculation](job, context);
    case queueNames.leadScraping:
      return handlers[queueNames.leadScraping](job, context);
    case queueNames.slackAlertDispatch:
      return handlers[queueNames.slackAlertDispatch](job, context);
    default: {
      const unhandledQueue: never = job.name;
      throw new Error(`Unhandled queue: ${unhandledQueue}`);
    }
  }
};
