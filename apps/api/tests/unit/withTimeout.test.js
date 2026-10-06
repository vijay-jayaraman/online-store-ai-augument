import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../../src/utils/withTimeout.js';

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves with the value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('PONG'), 1_000)).resolves.toBe('PONG');
  });

  it('passes through a rejection from the promise', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1_000)).rejects.toThrow('boom');
  });

  it('rejects when the promise takes longer than the timeout', async () => {
    const result = withTimeout(new Promise(() => {}), 1_000);
    const assertion = expect(result).rejects.toThrow('Timed out after 1000 ms');

    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it('uses a custom timeout message', async () => {
    const result = withTimeout(new Promise(() => {}), 50, 'ping timed out');
    const assertion = expect(result).rejects.toThrow('ping timed out');

    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it('clears its timer once the promise settles', async () => {
    await withTimeout(Promise.resolve(1), 1_000);

    expect(vi.getTimerCount()).toBe(0);
  });
});
