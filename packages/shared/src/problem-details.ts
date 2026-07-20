import { DomainError, ForbiddenError, NotFoundError, OneCareError, UnauthorizedError } from './errors';

/** Canonical error categories for enterprise APIs — stable codes, not HTTP status. */
export const ERROR_CATEGORIES = {
  BUSINESS: 'business',
  VALIDATION: 'validation',
  AUTHORIZATION: 'authorization',
  AUTHENTICATION: 'authentication',
  CONNECTOR: 'connector',
  TIMEOUT: 'timeout',
  AI: 'ai',
  TOOL: 'tool',
  PLANNER: 'planner',
  CAPABILITY: 'capability',
  NETWORK: 'network',
  RATE_LIMIT: 'rate_limit',
  CONFLICT: 'conflict',
  NOT_FOUND: 'not_found',
  UNKNOWN: 'unknown',
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly code: string;
  readonly category: ErrorCategory;
  readonly instance?: string;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super('VALIDATION', message, {
      retryable: false,
      ...(details ? { details } : {}),
    });
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends OneCareError {
  constructor(message = 'Operation timed out', details?: Readonly<Record<string, unknown>>) {
    super('TIMEOUT', message, {
      retryable: true,
      ...(details ? { details } : {}),
    });
    this.name = 'TimeoutError';
  }
}

export class ConnectorError extends OneCareError {
  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; details?: Readonly<Record<string, unknown>>; cause?: unknown },
  ) {
    super(code, message, {
      retryable: options?.retryable ?? true,
      ...(options?.details ? { details: options.details } : {}),
      ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = 'ConnectorError';
  }
}

export class AiError extends OneCareError {
  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; details?: Readonly<Record<string, unknown>>; cause?: unknown },
  ) {
    super(code, message, {
      retryable: options?.retryable ?? false,
      ...(options?.details ? { details: options.details } : {}),
      ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = 'AiError';
  }
}

export class ToolError extends OneCareError {
  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; details?: Readonly<Record<string, unknown>>; cause?: unknown },
  ) {
    super(code, message, {
      retryable: options?.retryable ?? false,
      ...(options?.details ? { details: options.details } : {}),
      ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = 'ToolError';
  }
}

export class CapabilityError extends OneCareError {
  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; details?: Readonly<Record<string, unknown>>; cause?: unknown },
  ) {
    super(code, message, {
      retryable: options?.retryable ?? false,
      ...(options?.details ? { details: options.details } : {}),
      ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = 'CapabilityError';
  }
}

export class NetworkError extends OneCareError {
  constructor(message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super('NETWORK_ERROR', message, {
      retryable: options?.retryable ?? true,
      ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = 'NetworkError';
  }
}

const CODE_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  TIMEOUT: 504,
  CONFIRMATION_REQUIRED: 409,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof UnauthorizedError) return ERROR_CATEGORIES.AUTHENTICATION;
  if (error instanceof ForbiddenError) return ERROR_CATEGORIES.AUTHORIZATION;
  if (error instanceof NotFoundError) return ERROR_CATEGORIES.NOT_FOUND;
  if (error instanceof ValidationError) return ERROR_CATEGORIES.VALIDATION;
  if (error instanceof TimeoutError) return ERROR_CATEGORIES.TIMEOUT;
  if (error instanceof ConnectorError) return ERROR_CATEGORIES.CONNECTOR;
  if (error instanceof AiError) return ERROR_CATEGORIES.AI;
  if (error instanceof ToolError) return ERROR_CATEGORIES.TOOL;
  if (error instanceof CapabilityError) return ERROR_CATEGORIES.CAPABILITY;
  if (error instanceof NetworkError) return ERROR_CATEGORIES.NETWORK;
  if (error instanceof DomainError) {
    if (error.code === 'RATE_LIMITED') return ERROR_CATEGORIES.RATE_LIMIT;
    if (error.code === 'VALIDATION') return ERROR_CATEGORIES.VALIDATION;
    if (error.code === 'FORBIDDEN') return ERROR_CATEGORIES.AUTHORIZATION;
    return ERROR_CATEGORIES.BUSINESS;
  }
  return ERROR_CATEGORIES.UNKNOWN;
}

export function toProblemDetails(
  error: unknown,
  context?: {
    readonly instance?: string;
    readonly correlationId?: string;
    readonly requestId?: string;
  },
): ProblemDetails {
  const category = categorizeError(error);

  if (error instanceof OneCareError) {
    const status = CODE_STATUS[error.code] ?? (category === ERROR_CATEGORIES.UNKNOWN ? 500 : 422);
    return {
      type: `https://onecare.local/errors/${category}`,
      title: titleForStatus(status),
      status,
      detail: error.message,
      code: error.code,
      category,
      retryable: error.retryable,
      ...(error.details ? { details: error.details } : {}),
      ...(context?.instance ? { instance: context.instance } : {}),
      ...(context?.correlationId ? { correlationId: context.correlationId } : {}),
      ...(context?.requestId ? { requestId: context.requestId } : {}),
    };
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    type: 'https://onecare.local/errors/unknown',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    code: 'INTERNAL_ERROR',
    category: ERROR_CATEGORIES.UNKNOWN,
    retryable: false,
    ...(context?.instance ? { instance: context.instance } : {}),
    ...(context?.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context?.requestId ? { requestId: context.requestId } : {}),
  };
}

function titleForStatus(status: number): string {
  switch (status) {
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return status >= 500 ? 'Internal Server Error' : 'Error';
  }
}
