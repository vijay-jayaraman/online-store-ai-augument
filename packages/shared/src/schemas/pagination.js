import { z } from 'zod';
import { PAGINATION } from '../constants/pagination.js';

// Query strings arrive as text, so values are coerced to numbers.
// Not strict: list routes extend this schema with their own filters.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});
