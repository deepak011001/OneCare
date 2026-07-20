import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  asCorrelationId,
  asRequestId,
  asSessionId,
  asTenantId,
  asTraceId,
  asUserId,
  type RequestContext,
} from '@onecare/shared';
import { createAiRuntime } from '../runtime';

function ctx(): RequestContext {
  return {
    correlationId: asCorrelationId('c1'),
    requestId: asRequestId('r1'),
    traceId: asTraceId('tr1'),
    tenantId: asTenantId('t1'),
    userId: asUserId('u1'),
    sessionId: asSessionId('s1'),
    roles: ['Employee'],
    permissions: ['ai.chat'],
    attributes: {},
  };
}

describe('MasterOrchestrator', () => {
  it('plans and chats via mock provider with streaming deltas', async () => {
    const runtime = createAiRuntime({ providerId: 'mock' });
    const deltas: string[] = [];
    const result = await runtime.orchestrator.chatStream(
      { message: 'What is my leave balance?', context: ctx() },
      (event) => {
        if (event.type === 'delta') {
          const data = event.data as { text?: string };
          if (data.text) deltas.push(data.text);
        }
      },
    );
    assert.ok(result.assistantMessage.length > 0);
    assert.ok(deltas.length > 0);
    assert.equal(result.plan.steps[0]?.agentId, 'employee');
    assert.equal(result.observation.provider, 'mock');
    assert.equal(runtime.agents.list().length, 10);
  });

  it('lists registered models including stubs', () => {
    const runtime = createAiRuntime();
    const models = runtime.providers.listModels();
    assert.ok(models.some((m) => m.provider === 'mock' && m.available));
    assert.ok(models.some((m) => m.provider === 'openai' && !m.available));
  });
});
