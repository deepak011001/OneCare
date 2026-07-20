import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asCorrelationId, asTenantId, asUserId } from '@onecare/shared';
import { createKekaConnector } from './keka/keka-connector';

describe('KekaConnector', () => {
  const baseContext = {
    tenantId: asTenantId('t1'),
    userId: asUserId('u1'),
    correlationId: asCorrelationId('c1'),
    roles: ['Employee'],
    attributes: {},
  };

  it('returns leave balance via stub client', async () => {
    const connector = createKekaConnector();
    await connector.initialize({ resolveSecret: async () => null });
    const result = await connector.executeTool({
      toolName: 'leaveBalance',
      arguments: {},
      context: {
        ...baseContext,
        permissions: ['leave.read'],
      },
    });
    assert.equal(result.ok, true);
    const data = result.data as { balances?: unknown[] };
    assert.ok(Array.isArray(data.balances));
  });

  it('lists leave types and holiday calendar', async () => {
    const connector = createKekaConnector();
    await connector.initialize({ resolveSecret: async () => null });
    const types = await connector.executeTool({
      toolName: 'leaveTypes',
      arguments: {},
      context: { ...baseContext, permissions: ['leave.read'] },
    });
    assert.equal(types.ok, true);
    const holidays = await connector.executeTool({
      toolName: 'holidayCalendar',
      arguments: {},
      context: { ...baseContext, permissions: ['holiday.read'] },
    });
    assert.equal(holidays.ok, true);
    const data = holidays.data as { holidays?: unknown[] };
    assert.ok(Array.isArray(data.holidays));
  });
});
