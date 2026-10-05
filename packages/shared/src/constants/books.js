// Book lifecycle (SRS §6, books.status). Only published books appear in the store.
export const BOOK_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

export const BOOK_STATUSES = Object.freeze(Object.values(BOOK_STATUS));
