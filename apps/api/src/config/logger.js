// Structured JSON logs on stdout (MAIN-02). Request logs add a request ID through pino-http in app.js.

import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});
