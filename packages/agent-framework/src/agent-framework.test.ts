import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createEnterpriseAgentPlatform,
  createAgentContext,
  runLifecyclePhase,
  assertAgentAccess,
  canAccessAgent,
  requestCollaboration,
  toRuntimeRegisteredAgent,
  AgentNotAuthorizedError,
  HandoffFailedError,
  createEmployeeEnterpriseAgent,
} from './index';

describe('agent registry', () => {
  it('registers, looks up, enables/disables, and finds by role/capability', () => {
    const { registry } = createEnterpriseAgentPlatform();
    assert.ok(registry.get('employee'));
    assert.ok(registry.findByRole('Employee').some((a) => a.id === 'employee'));
    assert.ok(registry.findByCapability('ess.knowledge').some((a) => a.id === 'employee'));

    registry.disable('employee');
    assert.equal(registry.get('employee')?.enabled, false);
    registry.enable('employee');
    assert.equal(registry.isEnabledForTenant('employee', 't1'), true);
    registry.setTenantOverride('t1', 'employee', false);
    assert.equal(registry.isEnabledForTenant('employee', 't1'), false);
  });

  it('reports health for all agents', async () => {
    const { registry } = createEnterpriseAgentPlatform();
    const health = await registry.health();
    assert.ok(health.length >= 10);
    assert.ok(health.every((h) => h.status === 'healthy'));
  });
});

describe('lifecycle + context', () => {
  it('runs lifecycle phases with defaults', async () => {
    const agent = createEmployeeEnterpriseAgent();
    const ctx = createAgentContext({
      tenantId: 't1',
      userId: 'u1',
      sessionId: 's1',
      requestId: 'r1',
      correlationId: 'c1',
      roles: ['Employee'],
      permissions: ['ai.chat'],
    });
    await runLifecyclePhase(agent.lifecycle, 'initialize', ctx);
    await runLifecyclePhase(agent.lifecycle, 'beforePlanning', ctx, 'hello');
    const out = await runLifecyclePhase(agent.lifecycle, 'beforeResponse', ctx, { ok: true });
    assert.deepEqual(out, { ok: true });
  });

  it('rejects incomplete context', () => {
    assert.throws(() =>
      createAgentContext({
        tenantId: '',
        userId: 'u',
        sessionId: 's',
        requestId: 'r',
        correlationId: 'c',
        roles: [],
        permissions: [],
      }),
    );
  });
});

describe('permissions', () => {
  it('validates roles and permissions', () => {
    const agent = createEmployeeEnterpriseAgent();
    assert.equal(
      canAccessAgent({
        agent,
        tenantId: 't1',
        roles: ['Employee'],
        permissions: ['ai.chat'],
      }),
      true,
    );
    assert.throws(
      () =>
        assertAgentAccess({
          agent,
          tenantId: 't1',
          roles: ['Contractor'],
          permissions: ['ai.chat'],
        }),
      AgentNotAuthorizedError,
    );
  });
});

describe('memory + handoff + approval + collaboration', () => {
  it('stores memory slices', async () => {
    const { memory } = createEnterpriseAgentPlatform();
    await memory.setConversation('c1', { turn: 1 });
    await memory.setWorking('w1', { plan: 'x' });
    await memory.setShortTerm('s1', { slot: 'leave' });
    await memory.setSummary('c1', 'User asked about leave');
    assert.deepEqual(await memory.getConversation('c1'), { turn: 1 });
    assert.equal(await memory.getSummary('c1'), 'User asked about leave');
    assert.deepEqual(await memory.retrieve?.('leave'), []);
  });

  it('transfers handoff with audit', async () => {
    const platform = createEnterpriseAgentPlatform();
    const ctx = createAgentContext({
      tenantId: 't1',
      userId: 'u1',
      sessionId: 's1',
      requestId: 'r1',
      correlationId: 'c1',
      roles: ['Employee'],
      permissions: ['ai.chat'],
      telemetry: platform.telemetry,
    });
    const result = await platform.handoffs.transfer({
      fromAgentId: 'employee',
      toAgentId: 'manager',
      reason: 'needs approval',
      context: ctx,
      pendingConfirmations: ['conf-1'],
      transferredAt: new Date().toISOString(),
    });
    assert.equal(result.ok, true);
    assert.ok(result.handoffId);
    assert.equal(platform.telemetry.snapshot().handoffs, 1);
    await assert.rejects(
      () =>
        platform.handoffs.transfer({
          fromAgentId: 'employee',
          toAgentId: 'employee',
          reason: 'noop',
          context: ctx,
          transferredAt: new Date().toISOString(),
        }),
      HandoffFailedError,
    );
  });

  it('supports approval lifecycle abstractions', async () => {
    const { approvals } = createEnterpriseAgentPlatform();
    const created = await approvals.create({
      tenantId: 't1',
      agentId: 'manager',
      requesterUserId: 'u1',
      approverUserIds: ['m1'],
      action: 'leave.approve',
      payload: { leaveId: 'L1' },
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal(created.status, 'pending');
    const expired = await approvals.expireDue();
    assert.ok(expired.some((a) => a.id === created.id));
    const next = await approvals.create({
      tenantId: 't1',
      agentId: 'manager',
      requesterUserId: 'u1',
      approverUserIds: ['m1'],
      action: 'leave.approve',
      payload: {},
    });
    const approved = await approvals.decide(next.id, 'approved', 'm1');
    assert.equal(approved.status, 'approved');
  });

  it('collaborates across agents without business logic', async () => {
    const platform = createEnterpriseAgentPlatform();
    const ctx = createAgentContext({
      tenantId: 't1',
      userId: 'u1',
      sessionId: 's1',
      requestId: 'r1',
      correlationId: 'c1',
      roles: ['Manager'],
      permissions: ['ai.chat'],
      telemetry: platform.telemetry,
    });
    const result = await requestCollaboration(platform.registry, {
      requestingAgentId: 'manager',
      targetAgentId: 'hr',
      intent: 'hr.case',
      context: ctx,
      payload: { topic: 'policy' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.fromAgentId, 'hr');
  });
});

describe('migration compatibility', () => {
  it('projects Employee Agent to runtime RegisteredAgent shape', () => {
    const agent = createEmployeeEnterpriseAgent();
    const projected = toRuntimeRegisteredAgent(agent);
    assert.equal(projected.id, 'employee');
    assert.ok(projected.supportedIntents.includes('employee.leave.balance'));
    assert.ok(projected.capabilities.some((c) => c.id === 'ess.knowledge'));
    assert.equal(projected.enabled, true);
  });

  it('default platform includes migrated employee agent', () => {
    const { registry } = createEnterpriseAgentPlatform();
    const employee = registry.get('employee');
    assert.ok(employee);
    assert.equal(employee!.owner, 'ess-platform');
    assert.equal(employee!.priority, 100);
    const runtimeList = registry.listEnabled().map(toRuntimeRegisteredAgent);
    assert.ok(runtimeList.some((a) => a.id === 'employee'));
  });
});
