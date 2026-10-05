// HTTP server entry point: starts listening, connects to MongoDB and Redis, and shuts down cleanly.

import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();
const dbAbort = new AbortController();

// Listen before the stores are connected so /health can report 503 while they come up.
const server = app.listen(env.API_PORT, (err) => {
  if (err) {
    logger.fatal({ err }, 'HTTP server failed to start');
    exit(1);
    return;
  }
  logger.info({ port: env.API_PORT }, `API listening on port ${env.API_PORT}`);
});

connectDB({ signal: dbAbort.signal }).catch((err) =>
  logger.error({ err }, 'MongoDB connection loop failed'),
);
connectRedis();

function exit(code) {
  // eslint-disable-next-line n/no-process-exit -- entry point decides the exit status.
  process.exit(code);
}

let shuttingDown = false;

async function shutdown(reason, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  setTimeout(() => {
    logger.error('Shutdown timed out; forcing exit');
    exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  dbAbort.abort();
  try {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeIdleConnections();
    });
    await Promise.allSettled([disconnectDB(), disconnectRedis()]);
    logger.info('Shutdown complete');
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    code = 1;
  }
  exit(code);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});
