// Express app setup. Kept separate from server.js so tests can use the app without opening a port.

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { genReqId } from './middleware/requestId.js';
import { apiRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      genReqId,
      // Puts the request ID at the top level of every log line written for this request.
      customProps: (req) => ({ requestId: req.id }),
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // A 5xx without a real error (such as a 503 from /health) gets no made-up error and stack.
      // The error handler sets `res.err` for real errors.
      customErrorObject: (req, res, err, value) => {
        if (res.err) return value;
        const withoutError = { ...value };
        delete withoutError.err;
        return withoutError;
      },
      customErrorMessage: (req, res) => (res.err ? 'request errored' : 'request completed'),
      // Keep request logs small, and never log headers such as Cookie or Authorization.
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(cookieParser());
  // The Razorpay webhook needs the raw body; mount its route before this parser.
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
