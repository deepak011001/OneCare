import {
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '@onecare/shared';
import type { RequestWithContext } from './correlation.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext & Request>();

    const correlationId = request.correlationId ?? 'unknown';
    const requestId = request.requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let code = 'INTERNAL_ERROR';
    let type = 'https://onecare.local/errors/internal';

    if (exception instanceof UnauthorizedError) {
      status = HttpStatus.UNAUTHORIZED;
      title = 'Unauthorized';
      detail = exception.message;
      code = exception.code;
      type = 'https://onecare.local/errors/unauthorized';
    } else if (exception instanceof ForbiddenError) {
      status = HttpStatus.FORBIDDEN;
      title = 'Forbidden';
      detail = exception.message;
      code = exception.code;
      type = 'https://onecare.local/errors/forbidden';
    } else if (exception instanceof NotFoundError) {
      status = HttpStatus.NOT_FOUND;
      title = 'Not Found';
      detail = exception.message;
      code = exception.code;
      type = 'https://onecare.local/errors/not-found';
    } else if (exception instanceof DomainError) {
      status =
        exception.code === 'RATE_LIMITED'
          ? HttpStatus.TOO_MANY_REQUESTS
          : HttpStatus.UNPROCESSABLE_ENTITY;
      title = exception.code === 'RATE_LIMITED' ? 'Too Many Requests' : 'Domain Error';
      detail = exception.message;
      code = exception.code;
      type =
        exception.code === 'RATE_LIMITED'
          ? 'https://onecare.local/errors/rate-limit'
          : 'https://onecare.local/errors/domain';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      detail = typeof body === 'string' ? body : exception.message;
      title = HttpStatus[status] ?? 'Error';
      code = 'HTTP_EXCEPTION';
      type = 'https://onecare.local/errors/http';
    }

    response.status(status).json({
      type,
      title,
      status,
      detail,
      code,
      instance: request.url,
      correlationId,
      requestId,
    });
  }
}
