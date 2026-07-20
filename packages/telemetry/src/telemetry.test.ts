import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { maskEmail, maskPhone, redactPii } from './pii';
import { InMemoryMetrics, NoOpTracer, TRACE_ATTR } from './otel';
import { PlatformMetrics } from './platform-metrics';

describe('pii redaction', () => {
  it('masks emails phones tokens and salary keys', () => {
    const redacted = redactPii({
      email: 'jane.doe@acme.com',
      phone: '+1 (555) 123-4567',
      authorization: 'Bearer abc.def.ghi',
      salary: 120000,
      note: 'Call +1 555 999 8888 about Bearer xyz',
      nested: { refreshToken: 'secret', ok: true },
    });
    assert.equal(redacted.email, maskEmail('jane.doe@acme.com'));
    assert.match(String(redacted.phone), /\*\*\*/);
    assert.equal(redacted.authorization, '[REDACTED]');
    assert.equal(redacted.salary, '[REDACTED]');
    assert.equal((redacted.nested as { refreshToken: string }).refreshToken, '[REDACTED]');
    assert.match(String(redacted.note), /Bearer \[REDACTED\]/);
    assert.ok(maskPhone('+15551234567').endsWith('4567'));
  });
});

describe('otel ports', () => {
  it('records platform metrics without vendor coupling', () => {
    const metrics = new InMemoryMetrics();
    const platform = new PlatformMetrics(metrics);
    platform.recordRequest({
      outcome: 'success',
      latencyMs: 42,
      capabilityId: 'ess.leave',
      promptTokens: 10,
      completionTokens: 20,
      estimatedCostUsd: 0.001,
    });
    assert.ok([...metrics.counters.keys()].some((k) => k.includes('onecare.request.count')));
    const tracer = new NoOpTracer();
    const span = tracer.startSpan('test', { [TRACE_ATTR.capabilityId]: 'ess.leave' });
    span.end();
  });
});
