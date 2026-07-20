import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HeuristicPlanner } from './heuristic-planner';

describe('HeuristicPlanner', () => {
  const planner = new HeuristicPlanner();
  const context = {
    tenantId: 't1',
    userId: 'u1',
    roles: ['Employee'],
    permissions: ['ai.chat'],
  };

  it('routes leave questions to employee agent', async () => {
    const plan = await planner.plan({ message: 'Show my leave balance', context });
    assert.equal(plan.mode, 'single_agent');
    assert.equal(plan.steps[0]?.agentId, 'employee');
  });

  it('supports multi-agent plans', async () => {
    const plan = await planner.plan({
      message: 'Approve team leave and notify the employee',
      context,
    });
    assert.ok(plan.steps.length >= 2);
    assert.equal(plan.mode, 'multi_agent');
  });
});
