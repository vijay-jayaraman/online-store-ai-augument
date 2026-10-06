import { ERROR_CODE } from '@bookstore/shared';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler.js';
import { AppError, notFound } from '../../src/utils/AppError.js';

function mockRes({ headersSent = false } = {}) {
  const res = { headersSent };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function handle(err, res = mockRes()) {
  const next = vi.fn();
  errorHandler(err, {}, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0] };
}

describe('errorHandler', () => {
  it('converts a Zod error into a 400 response with details', () => {
    const schema = z.object({ page: z.number().int().min(1), email: z.email() });
    const { error } = schema.safeParse({ page: 0, email: 'not-an-email' });

    const { res, next, body } = handle(error);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body).toEqual({
      error: {
        code: ERROR_CODE.VALIDATION_ERROR,
        message: 'Invalid request',
        details: [
          { path: 'page', message: expect.any(String), code: 'too_small' },
          { path: 'email', message: expect.any(String), code: 'invalid_format' },
        ],
      },
    });
  });

  it('joins nested Zod paths with dots', () => {
    const { error } = z.object({ items: z.array(z.object({ qty: z.number() })) }).safeParse({
      items: [{ qty: 'x' }],
    });

    expect(handle(error).body.error.details[0].path).toBe('items.0.qty');
  });

  it('uses the status, code, message, and details of an AppError', () => {
    const err = new AppError(409, ERROR_CODE.CONFLICT, 'Already exists', { field: 'slug' });

    const { res, body } = handle(err);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(body).toEqual({
      error: { code: ERROR_CODE.CONFLICT, message: 'Already exists', details: { field: 'slug' } },
    });
  });

  it('sends null details when an AppError has none', () => {
    const { res, body } = handle(notFound('Book not found'));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(body).toEqual({
      error: { code: ERROR_CODE.NOT_FOUND, message: 'Book not found', details: null },
    });
  });

  it('returns 400 for a malformed JSON body', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
      status: 400,
      expose: true,
    });

    const { res, body } = handle(err);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(body.error).toEqual({
      code: ERROR_CODE.VALIDATION_ERROR,
      message: 'Malformed JSON body',
      details: null,
    });
  });

  it('returns 413 for a body that is too large', () => {
    const err = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
      expose: true,
    });

    const { res, body } = handle(err);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(body.error.code).toBe(ERROR_CODE.VALIDATION_ERROR);
  });

  it.each([
    [401, ERROR_CODE.UNAUTHORIZED],
    [403, ERROR_CODE.FORBIDDEN],
    [404, ERROR_CODE.NOT_FOUND],
    [409, ERROR_CODE.CONFLICT],
    [429, ERROR_CODE.RATE_LIMITED],
    [405, ERROR_CODE.VALIDATION_ERROR],
  ])('maps an exposed %i http error to %s', (status, code) => {
    const err = Object.assign(new Error('Client error'), { status, expose: true });

    const { res, body } = handle(err);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(body.error).toEqual({ code, message: 'Client error', details: null });
  });

  it('returns a generic 500 and attaches the error for logging', () => {
    const err = new Error('database password is hunter2');

    const { res, body } = handle(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body).toEqual({
      error: { code: ERROR_CODE.INTERNAL_ERROR, message: 'Internal server error', details: null },
    });
    expect(res.err).toBe(err);
  });

  it('treats a non-exposed error with a status as a 500', () => {
    const err = Object.assign(new Error('internal detail'), { status: 400, expose: false });

    const { res, body } = handle(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.error.message).toBe('Internal server error');
  });

  it('does not attach client errors for error logging', () => {
    const { res } = handle(notFound());

    expect(res.err).toBeUndefined();
  });

  it('delegates to Express when headers were already sent', () => {
    const err = new Error('late failure');
    const res = mockRes({ headersSent: true });

    const { next } = handle(err, res);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  it('passes a 404 AppError naming the method and path', () => {
    const next = vi.fn();

    notFoundHandler({ method: 'DELETE', originalUrl: '/api/v1/nope?x=1' }, {}, next);

    const [err] = next.mock.calls[0];
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({
      status: 404,
      code: ERROR_CODE.NOT_FOUND,
      message: 'Route DELETE /api/v1/nope?x=1 not found',
    });
  });
});
