import { describe, expect, it } from 'vitest';
import {
  BOOK_STATUS,
  BOOK_STATUSES,
  ERROR_CODE,
  ERROR_CODES,
  FILE_SIZE_LIMITS,
  FILE_TYPES,
  ORDER_STATUS,
  ORDER_STATUSES,
  PAGINATION,
  ROLE,
  ROLES,
} from '../src/index.js';

describe('constants', () => {
  it('lists the roles from SRS §6', () => {
    expect(ROLES).toEqual(['buyer', 'admin']);
    expect(ROLE.ADMIN).toBe('admin');
  });

  it('lists the book statuses from SRS §6', () => {
    expect(BOOK_STATUSES).toEqual(['draft', 'published', 'archived']);
  });

  it('lists the order statuses from SRS §6', () => {
    expect(ORDER_STATUSES).toEqual(['pending', 'paid', 'failed', 'expired', 'refunded']);
  });

  it('uses each error code as its own value', () => {
    for (const [key, value] of Object.entries(ERROR_CODE)) {
      expect(value).toBe(key);
    }
    expect(ERROR_CODES).toContain('VALIDATION_ERROR');
  });

  it('allows only PDFs for books and samples, and images for covers', () => {
    expect(FILE_TYPES.PDF).toEqual(['application/pdf']);
    expect(FILE_TYPES.SAMPLE).toEqual(['application/pdf']);
    expect(FILE_TYPES.COVER).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  it('sets positive file size limits in bytes', () => {
    for (const limit of Object.values(FILE_SIZE_LIMITS)) {
      expect(Number.isInteger(limit) && limit > 0).toBe(true);
    }
  });

  it('keeps the default page size within the maximum', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(PAGINATION.MAX_PAGE_SIZE);
  });

  it.each([
    ['ROLE', ROLE],
    ['BOOK_STATUS', BOOK_STATUS],
    ['ORDER_STATUS', ORDER_STATUS],
    ['ERROR_CODE', ERROR_CODE],
    ['FILE_TYPES', FILE_TYPES],
    ['FILE_TYPES.COVER', FILE_TYPES.COVER],
    ['FILE_SIZE_LIMITS', FILE_SIZE_LIMITS],
    ['PAGINATION', PAGINATION],
    ['ORDER_STATUSES', ORDER_STATUSES],
  ])('freezes %s', (_name, value) => {
    expect(Object.isFrozen(value)).toBe(true);
  });
});
