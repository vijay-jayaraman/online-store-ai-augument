// Loads apps/api/.env and validates the environment once at startup.
// Variables already set in the process (Docker, CI, tests) take precedence over the file.

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: new URL('../../.env', import.meta.url), quiet: true });

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(4000),
  MONGODB_URI: z
    .string({ error: 'Required' })
    .regex(/^mongodb(\+srv)?:\/\//, 'Must start with mongodb:// or mongodb+srv://'),
  REDIS_URL: z
    .string({ error: 'Required' })
    .regex(/^rediss?:\/\//, 'Must start with redis:// or rediss://'),
  // Comma-separated list of allowed browser origins, e.g. the store and admin app URLs.
  CORS_ORIGINS: z
    .string({ error: 'Required' })
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url('Must be a comma-separated list of URLs')).min(1, 'Required')),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

// Returns the validated environment, or throws an error that names every invalid variable.
export function parseEnv(source) {
  const result = envSchema.safeParse(source);
  if (result.success) return Object.freeze(result.data);

  const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  const error = new Error(
    `Invalid API environment variables:\n${lines.join('\n')}\n` +
      'Copy apps/api/.env.example to apps/api/.env and fill in the values.',
  );
  error.name = 'EnvValidationError';
  throw error;
}

function loadEnv() {
  try {
    return parseEnv(process.env);
  } catch (error) {
    console.error(error.message);
    // eslint-disable-next-line n/no-process-exit -- the API cannot run without valid configuration.
    process.exit(1);
  }
}

export const env = loadEnv();
