// src/config/redis.js against a fake ioredis client, so no Redis server is needed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const log = vi.hoisted(() => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }));

vi.mock('../../src/config/logger.js', () => ({
  logger: { ...log, child: () => log },
}));

vi.mock('ioredis', async () => {
  const { EventEmitter } = await import('node:events');
  class FakeRedis extends EventEmitter {
    constructor(url, options) {
      super();
      this.url = url;
      this.options = options;
      this.status = 'wait';
      this.connect = vi.fn();
      this.quit = vi.fn();
      this.disconnect = vi.fn();
      this.ping = vi.fn();
    }
  }
  return { Redis: FakeRedis };
});

const { redis, connectRedis, disconnectRedis, isRedisUp } =
  await import('../../src/config/redis.js');

beforeEach(() => {
  vi.clearAllMocks();
  redis.status = 'wait';
});

describe('redis client', () => {
  it('is created lazily with fail-fast options', () => {
    expect(redis.url).toBe(process.env.REDIS_URL);
    expect(redis.options).toEqual({
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    expect(redis.connect).not.toHaveBeenCalled();
  });

  it('logs each distinct connection error once, and again after a reconnect', () => {
    redis.emit('error', new Error('ECONNREFUSED'));
    redis.emit('error', new Error('ECONNREFUSED'));
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith({ err: 'ECONNREFUSED' }, 'Redis connection error');

    redis.emit('error', new Error('ETIMEDOUT'));
    expect(log.warn).toHaveBeenCalledTimes(2);

    redis.emit('ready');
    expect(log.info).toHaveBeenCalledWith('Redis connected');

    redis.emit('error', new Error('ETIMEDOUT'));
    expect(log.warn).toHaveBeenCalledTimes(3);
  });
});

describe('connectRedis', () => {
  it('connects the client', async () => {
    redis.connect.mockResolvedValue();

    await connectRedis();

    expect(redis.connect).toHaveBeenCalledTimes(1);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('does not throw when Redis is unreachable; it keeps retrying in the background', async () => {
    redis.connect.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(connectRedis()).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledWith(
      { err: 'ECONNREFUSED' },
      'Redis not reachable yet; retrying in the background',
    );
  });
});

describe('disconnectRedis', () => {
  it('does nothing when the client has already ended', async () => {
    redis.status = 'end';

    await disconnectRedis();

    expect(redis.quit).not.toHaveBeenCalled();
    expect(redis.disconnect).not.toHaveBeenCalled();
    expect(log.info).not.toHaveBeenCalled();
  });

  it('quits gracefully when connected', async () => {
    redis.status = 'ready';
    redis.quit.mockResolvedValue('OK');

    await disconnectRedis();

    expect(redis.quit).toHaveBeenCalledTimes(1);
    expect(redis.disconnect).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith('Redis connection closed');
  });

  it('drops the connection immediately when not connected', async () => {
    redis.status = 'reconnecting';

    await disconnectRedis();

    expect(redis.disconnect).toHaveBeenCalledTimes(1);
    expect(redis.quit).not.toHaveBeenCalled();
  });
});

describe('isRedisUp', () => {
  afterEach(() => vi.useRealTimers());

  it('is false without pinging when the client is not ready', async () => {
    redis.status = 'connecting';

    await expect(isRedisUp()).resolves.toBe(false);
    expect(redis.ping).not.toHaveBeenCalled();
  });

  it('is true when a ping returns PONG', async () => {
    redis.status = 'ready';
    redis.ping.mockResolvedValue('PONG');

    await expect(isRedisUp()).resolves.toBe(true);
  });

  it('is false when the ping fails', async () => {
    redis.status = 'ready';
    redis.ping.mockRejectedValue(new Error('Connection is closed.'));

    await expect(isRedisUp()).resolves.toBe(false);
  });

  it('is false when the ping takes longer than a second', async () => {
    vi.useFakeTimers();
    redis.status = 'ready';
    redis.ping.mockReturnValue(new Promise(() => {}));

    const result = isRedisUp();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toBe(false);
  });
});
