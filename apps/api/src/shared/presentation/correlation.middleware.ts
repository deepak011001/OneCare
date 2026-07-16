import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { asCorrelationId, asRequestId, asTraceId } from '@onecare/shared';

export type RequestWithContext = Request & {
  correlationId: string;
  requestId: string;
  traceId: string;
};

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = String(req.header('x-correlation-id') ?? randomUUID());
  const requestId = randomUUID();
  const traceId = String(req.header('x-trace-id') ?? correlationId);

  const typed = req as RequestWithContext;
  typed.correlationId = asCorrelationId(correlationId);
  typed.requestId = asRequestId(requestId);
  typed.traceId = asTraceId(traceId);

  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-trace-id', traceId);
  next();
}
