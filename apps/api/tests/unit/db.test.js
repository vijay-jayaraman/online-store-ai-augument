// src/config/db.js against a fake mongoose, with the backoff sleep replaced so retries are instant.
// The real connection is covered by the integration tests (in-memory MongoDB).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
  ping: vi.fn(),
  sleep: vi.fn(),
}));

vi.mock('../../src/config/logger.js', () => ({
  logger: { ...mocks.log, child: () => mocks.log },
}));

vi.mock('node:timers/promises', () => ({ setTimeout: mocks.sleep }));

vi.mock('mongoose', async () => {
  const { EventEmitter } = await import('node:events');
  const connection = Object.assign(new EventEmitter(), {
    readyState: 0,
    db: { admin: () => ({ ping: mocks.ping }) },
  });
  return { default: { connect: mocks.connect, disconnect: mocks.disconnect, connection } };
});

const { default: mongoose } = await import('mongoose');
const { connectDB, disconnectDB, isDBUp } = await import('../../src/config/db.js');

const abortError = () =>
  Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sleep.mockResolvedValue(undefined);
  mongoose.connection.readyState = 0;
});

// Tests share the module's state (listeners attached once, then shutdown), so they run in order.
describe('connectDB', () => {
  it('connects on the first attempt and attaches connection listeners once', async () => {
    mocks.connect.mockResolvedValue(undefined);

    await expect(connectDB({ uri: 'mongodb://db.test/app' })).resolves.toBe(mongoose.connection);
    await connectDB({ uri: 'mongodb://db.test/app' });

    expect(mocks.connect).toHaveBeenCalledWith('mongodb://db.test/app', {
      serverSelectionTimeoutMS: 5_000,
    });
    expect(mocks.sleep).not.toHaveBeenCalled();
    expect(mocks.log.info).toHaveBeenCalledWith('MongoDB connected');
    for (const event of ['disconnected', 'reconnected', 'error']) {
      expect(mongoose.connection.listenerCount(event)).toBe(1);
    }
  });

  it('uses MONGODB_URI from the environment by default', async () => {
    mocks.connect.mockResolvedValue(undefined);

    await connectDB();

    expect(mocks.connect).toHaveBeenCalledWith(process.env.MONGODB_URI, expect.any(Object));
  });

  it('retries with exponential backoff capped at 30 seconds', async () => {
    for (let i = 0; i < 7; i += 1) mocks.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    mocks.connect.mockResolvedValueOnce(undefined);

    await expect(connectDB()).resolves.toBe(mongoose.connection);

    expect(mocks.connect).toHaveBeenCalledTimes(8);
    expect(mocks.sleep.mock.calls.map(([ms]) => ms)).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000,
    ]);
    expect(mocks.log.warn).toHaveBeenCalledWith(
      { err: 'ECONNREFUSED', attempt: 1, retryInMs: 1_000 },
      'MongoDB connection failed',
    );
  });

  it('stops without connecting when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(connectDB({ signal: controller.signal })).resolves.toBeNull();

    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.log.info).toHaveBeenCalledWith('MongoDB connection attempts stopped');
  });

  it('stops retrying when shutdown aborts the backoff wait', async () => {
    const controller = new AbortController();
    mocks.connect.mockRejectedValue(new Error('ECONNREFUSED'));
    mocks.sleep.mockImplementationOnce(async (ms, value, { signal }) => {
      controller.abort();
      if (signal.aborted) throw abortError();
    });

    await expect(connectDB({ signal: controller.signal })).resolves.toBeNull();

    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.sleep).toHaveBeenCalledWith(1_000, undefined, { signal: controller.signal });
    expect(mocks.log.info).toHaveBeenCalledWith('MongoDB connection attempts stopped');
  });
});

describe('connection events', () => {
  it('logs disconnects, reconnects, and errors while running', () => {
    const err = new Error('socket closed');

    mongoose.connection.emit('disconnected');
    mongoose.connection.emit('reconnected');
    mongoose.connection.emit('error', err);

    expect(mocks.log.warn).toHaveBeenCalledWith('MongoDB disconnected');
    expect(mocks.log.info).toHaveBeenCalledWith('MongoDB reconnected');
    expect(mocks.log.error).toHaveBeenCalledWith({ err }, 'MongoDB connection error');
  });

  it('does not warn about the disconnect caused by a planned shutdown', async () => {
    mocks.disconnect.mockImplementation(async () => mongoose.connection.emit('disconnected'));

    await disconnectDB();

    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.log.warn).not.toHaveBeenCalled();
    expect(mocks.log.info).toHaveBeenCalledWith('MongoDB connection closed');
  });
});

describe('isDBUp', () => {
  afterEach(() => vi.useRealTimers());

  it('is false without pinging when not connected', async () => {
    mongoose.connection.readyState = 2; // connecting

    await expect(isDBUp()).resolves.toBe(false);
    expect(mocks.ping).not.toHaveBeenCalled();
  });

  it('is true when connected and the ping succeeds', async () => {
    mongoose.connection.readyState = 1;
    mocks.ping.mockResolvedValue({ ok: 1 });

    await expect(isDBUp()).resolves.toBe(true);
  });

  it('is false when the ping fails', async () => {
    mongoose.connection.readyState = 1;
    mocks.ping.mockRejectedValue(new Error('not primary'));

    await expect(isDBUp()).resolves.toBe(false);
  });

  it('is false when the ping takes longer than a second', async () => {
    vi.useFakeTimers();
    mongoose.connection.readyState = 1;
    mocks.ping.mockReturnValue(new Promise(() => {}));

    const result = isDBUp();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toBe(false);
  });
});
