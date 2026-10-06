import { inject } from 'vitest';

// The in-memory MongoDB URI with a database per worker, so files running in parallel
// never clear each other's data.
export function testDatabaseUri() {
  const uri = new URL(inject('mongoUri'));
  uri.pathname = `/test-${process.env.VITEST_POOL_ID ?? '0'}`;
  return uri.toString();
}
