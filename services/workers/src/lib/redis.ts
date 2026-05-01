import Redis from "ioredis";

import { getEnv } from "../config/env.js";

const env = getEnv();
let sharedRedis: Redis | undefined;
const ownedConnections = new Set<Redis>();

const baseOptions = {
  connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
  enableReadyCheck: true,
  lazyConnect: false,
  tls: env.REDIS_TLS_ENABLED ? {} : undefined,
};

export const getRedisClient = (): Redis => {
  if (!sharedRedis) {
    sharedRedis = new Redis(env.REDIS_URL, {
      ...baseOptions,
      maxRetriesPerRequest: 3,
    });
    ownedConnections.add(sharedRedis);
  }

  return sharedRedis;
};

export const createBullRedisConnection = (): Redis => {
  const connection = new Redis(env.REDIS_URL, {
    ...baseOptions,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  ownedConnections.add(connection);
  return connection;
};

export const closeRedisConnections = async (): Promise<void> => {
  await Promise.all(Array.from(ownedConnections).map(async (connection) => {
    try {
      await connection.quit();
    } catch {
      connection.disconnect();
    }
  }));

  ownedConnections.clear();
  sharedRedis = undefined;
};
