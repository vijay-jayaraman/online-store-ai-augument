// Default ("happy path") API responses for component tests. The admin app makes no API calls
// yet; admin features add their handlers here. Override one in a test with `server.use(...)`.

import { API_URL } from '../../src/lib/config.js';

export const apiUrl = (path) => `${API_URL}${path}`;

export const handlers = [];
