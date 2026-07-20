import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  asCorrelationId,
  asTenantId,
  asUserId,
} from '@onecare/shared';
import { createKekaConnector } from '@onecare/connectors';
import { CircuitBreaker } from './resilience';
import { ConnectorRegistry, EnvConnectorSecrets, McpGatewayService } from './index';

describe('McpGatewayService', () => {
  it('lists tools from registered connectors', async () => {
    const registry = new ConnectorRegistry();
    const keka = createKekaConnector();
    registry.register(keka);
    await registry.initializeAll(new EnvConnectorSecrets());
    const gateway = new McpGatewayService(registry);
    const tools = gateway.listTools();
    assert.ok(tools.some((t) => t.name === 'leaveBalance' && t.connectorId === 'keka'));
  });

  it('executes leaveBalance end-to-end', async () => {
    const registry = new ConnectorRegistry();
    registry.register(createKekaConnector());
    await registry.initializeAll(new EnvConnectorSecrets());
    const gateway = new McpGatewayService(registry);
    const result = await gateway.execute({
      connectorId: 'keka',
      toolName: 'leaveBalance',
      arguments: {},
      context: {
        tenantId: asTenantId('t1'),
        userId: asUserId('u1'),
        correlationId: asCorrelationId('c1'),
        roles: ['Employee'],
        permissions: ['leave.apply', 'mcp.execute'],
        attributes: {},
      },
    });
    assert.equal(result.ok, true);
  });
});

describe('CircuitBreaker', () => {
  it('opens after repeated failures', () => {
    const breaker = new CircuitBreaker(2, 10_000);
    breaker.recordFailure('k');
    assert.equal(breaker.canExecute('k'), true);
    breaker.recordFailure('k');
    assert.equal(breaker.canExecute('k'), false);
  });
});
