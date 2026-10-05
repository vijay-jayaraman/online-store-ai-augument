// Turns every error into `{ error: { code, message, details } }` (SRS 4.2).

import { ERROR_CODE } from '@bookstore/shared';
import { ZodError } from 'zod';
import { AppError, notFound } from '../utils/AppError.js';

const CODE_BY_STATUS = {
  401: ERROR_CODE.UNAUTHORIZED,
  403: ERROR_CODE.FORBIDDEN,
  404: ERROR_CODE.NOT_FOUND,
  409: ERROR_CODE.CONFLICT,
  429: ERROR_CODE.RATE_LIMITED,
};

export const formatZodIssues = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

// Maps any thrown value to `{ status, code, message, details }`.
export function toErrorResponse(err) {
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: ERROR_CODE.VALIDATION_ERROR,
      message: 'Invalid request',
      details: formatZodIssues(err),
    };
  }

  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }

  // Errors from body-parser (express.json) and other http-errors based middleware.
  if (err?.type === 'entity.parse.failed') {
    return {
      status: 400,
      code: ERROR_CODE.VALIDATION_ERROR,
      message: 'Malformed JSON body',
      details: null,
    };
  }
  if (err?.type === 'entity.too.large') {
    return {
      status: 413,
      code: ERROR_CODE.VALIDATION_ERROR,
      message: 'Request body too large',
      details: null,
    };
  }
  const status = err?.status ?? err?.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500 && err.expose) {
    return {
      status,
      code: CODE_BY_STATUS[status] ?? ERROR_CODE.VALIDATION_ERROR,
      message: err.message,
      details: null,
    };
  }

  return {
    status: 500,
    code: ERROR_CODE.INTERNAL_ERROR,
    message: 'Internal server error',
    details: null,
  };
}

export function notFoundHandler(req, res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Express recognises error handlers by their four parameters, so `next` must stay.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const { status, code, message, details } = toErrorResponse(err);
  // pino-http logs `res.err` with its stack on the request's completion log line.
  if (status >= 500) res.err = err;

  res.status(status).json({ error: { code, message, details: details ?? null } });
}
