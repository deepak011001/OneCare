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

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  let attempt = 0;
  let delay = options.initialDelayMs;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const retryable = options.shouldRetry?.(error) ?? false;
      if (!retryable || attempt >= options.maxAttempts) {
        throw error;
      }
      await sleep(delay);
      delay = Math.min(delay * 2, options.maxDelayMs);
    }
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('EXECUTION_TIMEOUT')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
