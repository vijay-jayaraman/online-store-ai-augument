import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Safe IDs from an upstream proxy are reused, so one ID follows a request across services.
const SAFE_REQUEST_ID = /^[\w-]{1,128}$/;

// pino-http `genReqId`: picks the request ID and echoes it in the response header.
export function genReqId(req, res) {
  const incoming = req.get(REQUEST_ID_HEADER);
  const id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.set(REQUEST_ID_HEADER, id);
  return id;
}
