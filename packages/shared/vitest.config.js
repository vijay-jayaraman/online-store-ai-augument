import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reporter: ['text', 'html', 'json-summary'],
      // CI fails below this (M1-02). Add tests rather than lowering it.
      thresholds: { lines: 80 },
    },
  },
});
