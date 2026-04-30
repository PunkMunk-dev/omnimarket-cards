import { Redis as RedisClient } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redisInstance: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (redisInstance) return redisInstance;

  redisInstance = new RedisClient(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      logger.warn({ times, delay }, "Redis connection retry");
      return delay;
    },
  });

  redisInstance.on("connect", () => logger.info("Redis connected"));
  redisInstance.on("error", (err: unknown) => logger.error({ err }, "Redis error"));
  redisInstance.on("close", () => logger.warn("Redis connection closed"));
  redisInstance.on("reconnecting", () => logger.info("Redis reconnecting"));

  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info("Redis connection closed gracefully");
  }
}

/** Dedicated connection for BullMQ (must not share with subscriber) */
export function createRedisConnection(): RedisClient {
  return new RedisClient(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}
