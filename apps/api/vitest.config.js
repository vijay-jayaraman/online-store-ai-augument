import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // src/config/env.js validates these at import. MONGODB_URI is a placeholder: integration
    // tests connect to the in-memory server URI provided by tests/setup/mongo.global.js.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/bookstore-test',
      REDIS_URL: 'redis://127.0.0.1:6379',
      CORS_ORIGINS: 'http://localhost:5173,http://localhost:5174',
      LOG_LEVEL: 'silent',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.js'],
          globalSetup: ['tests/setup/mongo.global.js'],
          setupFiles: ['tests/setup/integration.setup.js'],
          // The first run downloads the MongoDB binary.
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
  },
});
