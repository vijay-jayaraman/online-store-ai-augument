import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server.js';

// jsdom does not implement scrolling; react-router's <ScrollRestoration> calls it on navigation.
window.scrollTo = () => {};

// Any request without an MSW handler fails the test instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  // Vitest globals are off, so Testing Library cannot register its own cleanup.
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterAll(() => server.close());
