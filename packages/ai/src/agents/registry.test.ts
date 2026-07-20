import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDefaultAgentRegistry } from './registry';

describe('agent registry', () => {
  it('registers placeholder agents with metadata', () => {
    const registry = createDefaultAgentRegistry();
    assert.equal(registry.list().length, 10);
    const employee = registry.get('employee');
    assert.equal(employee?.name, 'EmployeeAgent');
    assert.ok((employee?.supportedIntents.length ?? 0) > 0);
    assert.ok((employee?.capabilities.length ?? 0) > 0);
  });
});
