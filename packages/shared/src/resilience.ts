export interface CircuitBreakerState {
  failures: number;
  openUntil: number;
}

export class CircuitBreaker {
  private readonly states = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
  ) {}

  canExecute(key: string): boolean {
    const state = this.states.get(key);
    if (!state) return true;
    if (state.openUntil > Date.now()) return false;
    if (state.openUntil !== 0 && state.openUntil <= Date.now()) {
      this.states.delete(key);
    }
    return true;
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  recordFailure(key: string): void {
    const current = this.states.get(key) ?? { failures: 0, openUntil: 0 };
    const failures = current.failures + 1;
    if (failures >= this.failureThreshold) {
      this.states.set(key, { failures, openUntil: Date.now() + this.cooldownMs });
    } else {
      this.states.set(key, { failures, openUntil: 0 });
    }
  }

  isOpen(key: string): boolean {
    const state = this.states.get(key);
    return Boolean(state && state.openUntil > Date.now());
  }
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitter?: boolean;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
  readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/** Exponential backoff with optional jitter — used by MCP, connectors, and AI. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let attempt = 0;
  let delay = options.initialDelayMs;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const retryable = options.shouldRetry?.(error, attempt) ?? false;
      if (!retryable || attempt >= options.maxAttempts) {
        throw error;
      }
      const jittered = options.jitter === false ? delay : delay * (0.5 + Math.random());
      const wait = Math.min(jittered, options.maxDelayMs);
      options.onRetry?.(error, attempt, wait);
      await sleep(wait);
      delay = Math.min(delay * 2, options.maxDelayMs);
    }
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'TIMEOUT',
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Simple bulkhead: limit concurrent executions per key. */
export class Bulkhead {
  private readonly inflight = new Map<string, number>();

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const current = this.inflight.get(key) ?? 0;
    if (current >= this.maxConcurrent) {
      throw new Error('BULKHEAD_FULL');
    }
    this.inflight.set(key, current + 1);
    try {
      return await fn();
    } finally {
      const next = (this.inflight.get(key) ?? 1) - 1;
      if (next <= 0) this.inflight.delete(key);
      else this.inflight.set(key, next);
    }
  }
}

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 2_000,
  jitter: true,
  shouldRetry: (error) => {
    if (error instanceof Error) {
      return (
        error.message.includes('TIMEOUT') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('429') ||
        error.message.includes('503')
      );
    }
    return false;
  },
};
