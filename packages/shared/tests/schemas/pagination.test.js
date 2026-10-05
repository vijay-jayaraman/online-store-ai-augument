import { describe, expect, it } from 'vitest';
import { PAGINATION, paginationQuerySchema } from '../../src/index.js';

describe('paginationQuerySchema', () => {
  describe('valid input', () => {
    it('coerces query-string values to numbers', () => {
      expect(paginationQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({
        page: 2,
        pageSize: 50,
      });
    });

    it('accepts numbers', () => {
      expect(paginationQuerySchema.parse({ page: 3, pageSize: 10 })).toEqual({
        page: 3,
        pageSize: 10,
      });
    });

    it('accepts pageSize equal to the maximum', () => {
      const result = paginationQuerySchema.parse({ pageSize: String(PAGINATION.MAX_PAGE_SIZE) });
      expect(result.pageSize).toBe(PAGINATION.MAX_PAGE_SIZE);
    });

    it('ignores unknown keys so routes can add filters', () => {
      expect(paginationQuerySchema.safeParse({ page: '1', q: 'dune' }).success).toBe(true);
    });
  });

  describe('defaults', () => {
    it('applies both defaults to an empty query', () => {
      expect(paginationQuerySchema.parse({})).toEqual({
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      });
    });

    it('defaults pageSize when only page is given', () => {
      expect(paginationQuerySchema.parse({ page: '4' })).toEqual({
        page: 4,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      });
    });
  });

  describe('invalid values', () => {
    it('rejects pageSize above the maximum', () => {
      const result = paginationQuerySchema.safeParse({ pageSize: PAGINATION.MAX_PAGE_SIZE + 1 });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(['pageSize']);
    });

    it.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', '1.5'],
      ['page', 'abc'],
      ['pageSize', '0'],
      ['pageSize', '-5'],
      ['pageSize', 'ten'],
    ])('rejects %s = %s', (key, value) => {
      const result = paginationQuerySchema.safeParse({ [key]: value });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual([key]);
    });
  });
});
