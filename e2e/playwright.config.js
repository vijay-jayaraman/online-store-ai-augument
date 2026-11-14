import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_URL, STORE_URL, isLocal } from './support/urls.js';

const CI = Boolean(process.env.CI);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// Start a dev server only for apps that run on this machine. Against staging, nothing is started.
// The API is not started: the smoke tests do not need it, and it also needs MongoDB and Redis.
const devServer = (workspace, url) => ({
  command: `npm run dev -w ${workspace}`,
  cwd: repoRoot,
  url,
  reuseExistingServer: !CI,
  timeout: 120_000,
  stdout: 'ignore',
  stderr: 'pipe',
});

const webServer = [
  isLocal(STORE_URL) && devServer('apps/store', STORE_URL),
  isLocal(ADMIN_URL) && devServer('apps/admin', ADMIN_URL),
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
