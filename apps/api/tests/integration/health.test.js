import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedisUp } from '../../src/config/redis.js';
import { api } from '../helpers/app.js';
import { testDatabaseUri } from '../helpers/db.js';

// MongoDB is the real in-memory server; Redis is not started, so its status is controlled here.
vi.mock('../../src/config/redis.js', async (importOriginal) => ({
  ...(await importOriginal()),
  isRedisUp: vi.fn(),
}));

describe('GET /api/v1/health', () => {
  beforeEach(() => {
    vi.mocked(isRedisUp).mockResolvedValue(true);
  });

  it('returns 200 when the database and Redis are up', async () => {
    const res = await api().get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up', redis: 'up' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns 503 when Redis is down', async () => {
    vi.mocked(isRedisUp).mockResolvedValue(false);

    const res = await api().get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'up', redis: 'down' });
  });

  it('returns 503 when the database is down', async () => {
    await mongoose.disconnect();
    try {
      const res = await api().get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'error', db: 'down', redis: 'up' });
    } finally {
      await mongoose.connect(testDatabaseUri());
    }
  });
});
