import { expect, test } from '@playwright/test';
import { API_URL } from '../support/urls.js';

test('API health reports MongoDB and Redis up', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/v1/health`);

  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toBe('no-store');
  expect(await res.json()).toEqual({ status: 'ok', db: 'up', redis: 'up' });
});
