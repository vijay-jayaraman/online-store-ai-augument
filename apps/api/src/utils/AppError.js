import { ERROR_CODE } from '@bookstore/shared';

// An expected error with an HTTP status and an error code from @bookstore/shared.
// The error handler sends it as `{ error: { code, message, details } }`.
export class AppError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (message = 'Resource not found', details = null) =>
  new AppError(404, ERROR_CODE.NOT_FOUND, message, details);
