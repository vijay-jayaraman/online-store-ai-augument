// Base URL of the REST API, including /api/v1. Set VITE_API_URL in apps/admin/.env to override.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// The buyer storefront, for the "View store" link.
export const STORE_URL = import.meta.env.VITE_STORE_URL || 'http://localhost:5173';

// Placeholder until the store settings come from the API (M14-01).
export const STORE_NAME = 'Page & Pine';

export const pageTitle = (title) => `${title} · Seller admin · ${STORE_NAME}`;
