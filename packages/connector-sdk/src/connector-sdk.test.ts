import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asCorrelationId, asTenantId, asUserId } from '@onecare/shared';
import { BaseEnterpriseConnector } from './base-connector';
import type { ConnectorHealthReport, ConnectorToolDefinition } from './types';

class TestConnector extends BaseEnterpriseConnector {
  readonly metadata = {
    id: 'test',
    name: 'Test',
    version: '1.0.0',
    vendor: 'OneCare',
  };
  readonly auth = { type: 'bearer' as const, secretRef: 'TEST_TOKEN' };
  readonly capabilities = {
    supportedTools: ['ping'],
    supportedResources: [],
    supportedEvents: [],
  };

  async health(): Promise<ConnectorHealthReport> {
    return { status: 'healthy', checkedAt: new Date().toISOString() };
  }

  listTools(): readonly ConnectorToolDefinition[] {
    return [
      {
        name: 'ping',
        description: 'Ping',
        category: 'test',
        version: '1.0.0',
        permissions: [],
        confirmationRequired: false,
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        sideEffect: 'read',
        risk: 'low',
      },
    ];
  }

  protected async invokeTool(): Promise<unknown> {
    return { pong: true };
  }
}

describe('connector-sdk', () => {
  it('executes a registered tool', async () => {
    const connector = new TestConnector();
    await connector.initialize({
      resolveSecret: async () => 'secret',
    });
    const result = await connector.executeTool({
      toolName: 'ping',
      arguments: {},
      context: {
        tenantId: asTenantId('t1'),
        userId: asUserId('u1'),
        correlationId: asCorrelationId('c1'),
        roles: [],
        permissions: [],
        attributes: {},
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { pong: true });
  });
});
