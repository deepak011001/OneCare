import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCapabilityRunner } from '@onecare/ess-capability';
import { createLeaveCapability, createEmployeeCapabilityRegistry } from './index';

describe('LeaveCapability framework compatibility', () => {
  it('registers on the employee capability registry', () => {
    const registry = createEmployeeCapabilityRegistry();
    const leave = registry.get('ess.leave');
    assert.ok(leave);
    assert.equal(leave!.id, 'ess.leave');
    assert.ok(leave!.supportedTools.includes('applyLeave'));
    assert.ok(registry.allDashboardWidgets().some((w) => w.id === 'leave.balance'));
    assert.ok(registry.allSuggestedPrompts().length >= 3);
    assert.equal(registry.allHelp()[0]?.capabilityId, 'ess.leave');
  });

  it('preserves process() clarify → ready behavior', () => {
    const capability = createLeaveCapability();
    const clarify = capability.process({
      message: 'Apply leave tomorrow',
      now: new Date(2026, 6, 20),
    });
    assert.equal(clarify.kind, 'clarify');

    const ready = capability.process({
      message: 'Family function',
      priorSlots: {
        startDate: '2026-08-10',
        endDate: '2026-08-10',
        leaveType: 'Casual',
      },
      now: new Date(2026, 6, 20),
      balances: [{ leaveType: 'Casual', available: 5 }],
      leaveTypes: ['Casual', 'Sick'],
    });
    assert.equal(ready.kind, 'ready');
    if (ready.kind === 'ready') {
      assert.equal(ready.toolName, 'applyLeave');
      assert.equal(ready.requiresConfirmation, true);
      assert.ok(ready.confirmationSummary?.includes('Casual'));
    }
  });

  it('runs through CapabilityRunner for apply with full slots', () => {
    const capability = createLeaveCapability();
    const runner = createCapabilityRunner();
    const outcome = runner.run(capability, {
      message: 'Apply casual leave tomorrow for family function',
      now: new Date(2026, 6, 20),
      extras: {
        balances: [{ leaveType: 'Casual', available: 5 }],
        leaveTypes: ['Casual'],
      },
    });
    assert.equal(outcome.kind, 'ready');
    if (outcome.kind === 'ready') {
      assert.equal(outcome.plan.toolName, 'applyLeave');
      assert.equal(outcome.plan.requiresConfirmation, true);
      assert.ok(outcome.confirmation?.summary);
    }
  });
});
