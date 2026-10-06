// The single RTK Query API. Feature folders add endpoints with `baseApi.injectEndpoints`.
// M5 replaces the base query with one that refreshes the access token on 401 and retries once.

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../lib/config.js';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    // Sends the httpOnly refresh-token cookie to the API.
    credentials: 'include',
  }),
  tagTypes: [],
  endpoints: () => ({}),
});
