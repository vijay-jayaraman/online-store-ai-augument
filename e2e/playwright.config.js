import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_URL, API_URL, STORE_URL, isLocal } from './support/urls.js';

const CI = Boolean(process.env.CI);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// Start a server only for apps that run on this machine. Against staging, nothing is started.
const devServer = (workspace, url) => ({
  command: `npm run dev -w ${workspace}`,
  cwd: repoRoot,
  url,
  reuseExistingServer: !CI,
  timeout: 120_000,
  stdout: 'ignore',
  stderr: 'pipe',
});

// The API runs against a local MongoDB and Redis (service containers in CI), in its own
// `bookstore-e2e` database. It is ready only when /health reports both stores up (503 until then).
// The explicit env overrides apps/api/.env, so the tests do not depend on that file.
const apiServer = {
  command: 'npm run start -w apps/api',
  cwd: repoRoot,
  url: `${API_URL}/api/v1/health`,
  reuseExistingServer: !CI,
  timeout: 60_000,
  // Quiet on a healthy run (LOG_LEVEL=warn); explains a timeout (e.g. "MongoDB connection failed").
  stdout: 'pipe',
  stderr: 'pipe',
  env: {
    NODE_ENV: 'test',
    API_PORT: new URL(API_URL).port || '4000',
    MONGODB_URI: process.env.E2E_MONGODB_URI || 'mongodb://localhost:27017/bookstore-e2e',
    REDIS_URL: process.env.E2E_REDIS_URL || 'redis://localhost:6379',
    CORS_ORIGINS: `${STORE_URL},${ADMIN_URL}`,
    LOG_LEVEL: 'warn',
  },
};

const webServer = [
  isLocal(STORE_URL) && devServer('apps/store', STORE_URL),
  isLocal(ADMIN_URL) && devServer('apps/admin', ADMIN_URL),
  isLocal(API_URL) && apiServer,
].filter(Boolean);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer,
});
