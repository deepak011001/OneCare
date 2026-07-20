import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiError,
  CapabilityError,
  ConnectorError,
  NetworkError,
  TimeoutError,
  ToolError,
  ValidationError,
  categorizeError,
  ERROR_CATEGORIES,
  toProblemDetails,
} from './problem-details';
import { Bulkhead, CircuitBreaker, withRetry } from './resilience';

describe('problem-details', () => {
  it('maps validation errors to 422', () => {
    const problem = toProblemDetails(new ValidationError('bad input', { field: 'email' }), {
      correlationId: 'c1',
      requestId: 'r1',
      instance: '/v1/x',
    });
    assert.equal(problem.status, 422);
    assert.equal(problem.category, ERROR_CATEGORIES.VALIDATION);
    assert.equal(problem.correlationId, 'c1');
    assert.equal(problem.retryable, false);
  });

  it('categorizes specialized errors', () => {
    assert.equal(categorizeError(new TimeoutError()), ERROR_CATEGORIES.TIMEOUT);
    assert.equal(
      categorizeError(new ConnectorError('KEKA_DOWN', 'down')),
      ERROR_CATEGORIES.CONNECTOR,
    );
    assert.equal(categorizeError(new AiError('LLM_FAIL', 'fail')), ERROR_CATEGORIES.AI);
    assert.equal(categorizeError(new ToolError('TOOL_FAIL', 'fail')), ERROR_CATEGORIES.TOOL);
    assert.equal(
      categorizeError(new CapabilityError('CAP_FAIL', 'fail')),
      ERROR_CATEGORIES.CAPABILITY,
    );
    assert.equal(categorizeError(new NetworkError('net')), ERROR_CATEGORIES.NETWORK);
  });
});

describe('resilience', () => {
  it('retries then succeeds', async () => {
    let attempts = 0;
    const value = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('TIMEOUT');
        return 'ok';
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 5,
        jitter: false,
        shouldRetry: (e) => e instanceof Error && e.message === 'TIMEOUT',
      },
    );
    assert.equal(value, 'ok');
    assert.equal(attempts, 3);
  });

  it('opens circuit after failures', () => {
    const breaker = new CircuitBreaker(2, 60_000);
    assert.equal(breaker.canExecute('keka'), true);
    breaker.recordFailure('keka');
    breaker.recordFailure('keka');
    assert.equal(breaker.isOpen('keka'), true);
    assert.equal(breaker.canExecute('keka'), false);
  });

  it('enforces bulkhead concurrency', async () => {
    const bulkhead = new Bulkhead(1);
    let started = 0;
    const slow = bulkhead.run('mcp', async () => {
      started += 1;
      await new Promise((r) => setTimeout(r, 30));
      return 1;
    });
    await assert.rejects(() => bulkhead.run('mcp', async () => 2), /BULKHEAD_FULL/);
    await slow;
    assert.equal(started, 1);
  });
});
