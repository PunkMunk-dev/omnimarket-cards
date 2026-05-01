import pino from "pino";

import { getEnv } from "../config/env.js";

const env = getEnv();

export const logger = pino({
  name: "cardscout-workers",
  level: env.LOG_LEVEL,
  base: {
    service: "workers",
    environment: env.NODE_ENV,
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
