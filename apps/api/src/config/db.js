// MongoDB connection through Mongoose.
// The first connection is retried with backoff; after that the driver reconnects on its own.

import { setTimeout as sleep } from 'node:timers/promises';
import mongoose from 'mongoose';
import { withTimeout } from '../utils/withTimeout.js';
import { env } from './env.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'mongodb' });

const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const PING_TIMEOUT_MS = 1_000;

let listenersAttached = false;
let closing = false;

// Attached after the first connection; failed first attempts are logged by the retry loop.
function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('disconnected', () => {
    if (!closing) log.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => log.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => log.error({ err }, 'MongoDB connection error'));
}

// Retries until connected, or until `signal` is aborted (during shutdown).
export async function connectDB({ uri = env.MONGODB_URI, signal } = {}) {
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 1; !signal?.aborted; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
      attachListeners();
      log.info('MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      log.warn({ err: err.message, attempt, retryInMs: delay }, 'MongoDB connection failed');
    }

    try {
      await sleep(delay, undefined, { signal });
    } catch {
      break; // Aborted while waiting.
    }
    delay = Math.min(delay * 2, MAX_DELAY_MS);
  }

  log.info('MongoDB connection attempts stopped');
  return null;
}

export async function disconnectDB() {
  closing = true;
  await mongoose.disconnect();
  log.info('MongoDB connection closed');
}

export async function isDBUp() {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    await withTimeout(mongoose.connection.db.admin().ping(), PING_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}
