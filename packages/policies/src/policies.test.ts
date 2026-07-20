import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asTenantId, asUserId } from '@onecare/shared';
import { createDefaultPolicyEngine } from './engine';

describe('PolicyEngine', () => {
  it('denies when permissions are missing', () => {
    const engine = createDefaultPolicyEngine();
    const result = engine.evaluate({
      tenantId: asTenantId('t1'),
      userId: asUserId('u1'),
      toolName: 'applyLeave',
      connectorId: 'keka',
      permissions: [],
      requiredPermissions: ['leave.apply'],
      confirmationRequired: false,
      confirmationApproved: false,
    });
    assert.equal(result.decision, 'deny');
  });

  it('requires confirmation when configured', () => {
    const engine = createDefaultPolicyEngine();
    const result = engine.evaluate({
      tenantId: asTenantId('t1'),
      userId: asUserId('u1'),
      toolName: 'applyLeave',
      connectorId: 'keka',
      permissions: ['leave.apply', 'mcp.execute'],
      requiredPermissions: ['leave.apply'],
      confirmationRequired: true,
      confirmationApproved: false,
    });
    assert.equal(result.decision, 'require_confirmation');
  });
});
