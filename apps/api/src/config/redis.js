// Shared Redis client for rate limits and caching.
// `lazyConnect` means importing this module opens no socket, so tests can import the app safely.
// BullMQ needs its own connections with `maxRetriesPerRequest: null`; do not reuse this client there.

import { Redis } from 'ioredis';
import { withTimeout } from '../utils/withTimeout.js';
import { env } from './env.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'redis' });

const PING_TIMEOUT_MS = 1_000;

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  // Fail commands fast while disconnected instead of queueing them.
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// ioredis emits `error` on every failed reconnect attempt; log each distinct error once.
let lastErrorMessage = null;
redis.on('error', (err) => {
  if (err.message === lastErrorMessage) return;
  lastErrorMessage = err.message;
  log.warn({ err: err.message }, 'Redis connection error');
});
redis.on('ready', () => {
  lastErrorMessage = null;
  log.info('Redis connected');
});

// The client keeps reconnecting in the background if the first attempt fails.
export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    log.warn({ err: err.message }, 'Redis not reachable yet; retrying in the background');
  }
}

export async function disconnectRedis() {
  if (redis.status === 'end') return;
  if (redis.status === 'ready') {
    await redis.quit();
  } else {
    redis.disconnect();
  }
  log.info('Redis connection closed');
}

export async function isRedisUp() {
  if (redis.status !== 'ready') return false;
  try {
    return (await withTimeout(redis.ping(), PING_TIMEOUT_MS)) === 'PONG';
  } catch {
    return false;
  }
}
