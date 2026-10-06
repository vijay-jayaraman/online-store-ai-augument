import { baseApi } from './baseApi.js';

// GET /health returns { status, db, redis }: 200 when everything is up, 503 otherwise.
export const healthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHealth: build.query({
      query: () => '/health',
    }),
  }),
});

export const { useGetHealthQuery } = healthApi;
