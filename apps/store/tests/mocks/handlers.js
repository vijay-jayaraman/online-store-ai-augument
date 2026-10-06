// Default ("happy path") API responses for component tests. Override one in a test with
// `server.use(...)`; overrides are reset after each test.

import { http, HttpResponse } from 'msw/http';
import { API_URL } from '../../src/lib/config.js';

export const apiUrl = (path) => `${API_URL}${path}`;

export const healthyResponse = { status: 'ok', db: 'up', redis: 'up' };

export const handlers = [http.get(apiUrl('/health'), () => HttpResponse.json(healthyResponse))];
