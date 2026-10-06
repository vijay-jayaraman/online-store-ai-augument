// Base URL of the REST API, including /api/v1. Set VITE_API_URL in apps/store/.env to override.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// Placeholder until the store settings come from the API (admin settings).
export const STORE_NAME = 'Page & Pine';
