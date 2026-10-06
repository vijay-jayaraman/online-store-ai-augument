import { describe, expect, it, vi } from 'vitest';
import { REQUEST_ID_HEADER, genReqId } from '../../src/middleware/requestId.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function run(incoming) {
  const req = { get: vi.fn(() => incoming) };
  const res = { set: vi.fn() };
  const id = genReqId(req, res);
  return { id, req, res };
}

describe('genReqId', () => {
  it('reuses a safe incoming request ID and echoes it', () => {
    const { id, req, res } = run('abc-123_XYZ');

    expect(req.get).toHaveBeenCalledWith(REQUEST_ID_HEADER);
    expect(id).toBe('abc-123_XYZ');
    expect(res.set).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'abc-123_XYZ');
  });

  it('generates a UUID when no request ID is sent', () => {
    const { id, res } = run(undefined);

    expect(id).toMatch(UUID);
    expect(res.set).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });

  it.each([
    ['contains unsafe characters', 'abc\n{"level":60}'],
    ['contains spaces', 'abc 123'],
    ['is longer than 128 characters', 'a'.repeat(129)],
    ['is empty', ''],
  ])('replaces an ID that %s', (_, incoming) => {
    const { id } = run(incoming);

    expect(id).not.toBe(incoming);
    expect(id).toMatch(UUID);
  });

  it('generates a different ID for each request', () => {
    expect(run(undefined).id).not.toBe(run(undefined).id);
  });
});
