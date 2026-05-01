import { queueNames, type WorkerQueueName } from "@cardscout/shared";

export const workerQueueNames = [
  queueNames.ebaySavedSearchRefresh,
  queueNames.psaSpreadCalculation,
  queueNames.oddsIngestion,
  queueNames.evCalculation,
  queueNames.leadScraping,
  queueNames.slackAlertDispatch,
] as const satisfies readonly WorkerQueueName[];

export const deadLetterQueueName = queueNames.deadLetter;
