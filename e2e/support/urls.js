// Base URLs of the apps under test. They default to the local dev servers; set STORE_URL,
// ADMIN_URL, and API_URL (in the environment or e2e/.env) to run the same tests against staging.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const trimSlash = (url) => url.replace(/\/+$/, '');

export const STORE_URL = trimSlash(process.env.STORE_URL || 'http://localhost:5173');
export const ADMIN_URL = trimSlash(process.env.ADMIN_URL || 'http://localhost:5174');
// Base URL without /api/v1. The full flows (TC-09, TC-10) will also call the API directly.
export const API_URL = trimSlash(process.env.API_URL || 'http://localhost:4000');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// True when the URL points at this machine, so Playwright should start the app itself.
export const isLocal = (url) => LOCAL_HOSTS.has(new URL(url).hostname);
