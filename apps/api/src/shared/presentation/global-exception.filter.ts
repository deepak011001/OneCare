import {
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { toProblemDetails } from '@onecare/shared';
import type { RequestWithContext } from './correlation.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext & Request>();

    const correlationId = request.correlationId ?? 'unknown';
    const requestId = request.requestId ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body && 'message' in body
            ? String((body as { message: unknown }).message)
            : exception.message;
      response.status(status).json({
        type: `https://onecare.local/errors/http`,
        title: HttpStatus[status] ?? 'Error',
        status,
        detail,
        code: 'HTTP_EXCEPTION',
        category: status === 429 ? 'rate_limit' : 'unknown',
        instance: request.url,
        correlationId,
        requestId,
        retryable: status === 429 || status >= 500,
        ...(typeof body === 'object' && body ? { details: body as Record<string, unknown> } : {}),
      });
      return;
    }

    const problem = toProblemDetails(exception, {
      instance: request.url,
      correlationId,
      requestId,
    });
    response.status(problem.status).json(problem);
  }
}
