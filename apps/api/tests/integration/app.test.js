import { ERROR_CODE } from '@bookstore/shared';
import { describe, expect, it } from 'vitest';
import { api } from '../helpers/app.js';

describe('app', () => {
  it('returns 404 in the standard error shape for an unknown route', async () => {
    const res = await api().get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      error: {
        code: ERROR_CODE.NOT_FOUND,
        message: 'Route GET /api/v1/does-not-exist not found',
        details: null,
      },
    });
  });

  it('returns 404 for routes outside /api/v1', async () => {
    const res = await api().get('/health');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERROR_CODE.NOT_FOUND);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await api()
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: ERROR_CODE.VALIDATION_ERROR, message: 'Malformed JSON body', details: null },
    });
  });

  it('generates a request ID when none is sent', async () => {
    const res = await api().get('/api/v1/does-not-exist');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes a request ID sent by the client', async () => {
    const res = await api().get('/api/v1/does-not-exist').set('X-Request-Id', 'trace-42');

    expect(res.headers['x-request-id']).toBe('trace-42');
  });

  it('sets security headers and hides X-Powered-By', async () => {
    const res = await api().get('/api/v1/does-not-exist');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS requests from a configured origin, with credentials', async () => {
    const res = await api().get('/api/v1/does-not-exist').set('Origin', 'http://localhost:5174');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow CORS requests from other origins', async () => {
    const res = await api().get('/api/v1/does-not-exist').set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
