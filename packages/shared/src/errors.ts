export type ErrorCode = string;

export class OneCareError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      details?: Readonly<Record<string, unknown>>;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'OneCareError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}

export class DomainError extends OneCareError {
  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      details?: Readonly<Record<string, unknown>>;
      cause?: unknown;
    },
  ) {
    super(code, message, options);
    this.name = 'DomainError';
  }
}

export class UnauthorizedError extends OneCareError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, { retryable: false });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends OneCareError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, { retryable: false });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends OneCareError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, { retryable: false });
    this.name = 'NotFoundError';
  }
}
