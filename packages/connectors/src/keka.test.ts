import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asCorrelationId, asTenantId, asUserId } from '@onecare/shared';
import { createKekaConnector } from './keka/keka-connector';

describe('KekaConnector', () => {
  it('returns leave balance via stub client', async () => {
    const connector = createKekaConnector();
    await connector.initialize({ resolveSecret: async () => null });
    const result = await connector.executeTool({
      toolName: 'leaveBalance',
      arguments: {},
      context: {
        tenantId: asTenantId('t1'),
        userId: asUserId('u1'),
        correlationId: asCorrelationId('c1'),
        roles: ['Employee'],
        permissions: ['leave.apply'],
        attributes: {},
      },
    });
    assert.equal(result.ok, true);
    const data = result.data as { balances?: unknown[] };
    assert.ok(Array.isArray(data.balances));
  });
});
