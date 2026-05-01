import { createBullRedisConnection } from "../lib/redis.js";

export const queueConnection = createBullRedisConnection();
