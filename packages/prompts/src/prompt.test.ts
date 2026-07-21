import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDefaultPromptRegistry } from './registry';
import { PromptValidationError } from './validate';

describe('prompt framework', () => {
  it('renders versioned templates with variables', () => {
    const registry = createDefaultPromptRegistry();
    const rendered = registry.render({
      promptId: 'orchestrator.system',
      variables: { tenantId: 'demo' },
    });
    assert.match(rendered.content, /tenant demo/);
    assert.equal(rendered.version, '1.1.0');
    assert.match(rendered.content, /Never invent/);
  });

  it('registers grounded Employee Agent system prompt', () => {
    const registry = createDefaultPromptRegistry();
    const employee = registry.render({
      promptId: 'agent.employee.system',
      variables: {
        agentName: 'Employee',
        agentId: 'employee',
        version: '1.0.0',
        capabilities: 'leave,attendance,knowledge',
      },
    });
    assert.match(employee.content, /never invent/i);
    assert.match(employee.content, /sources|professional HR/i);
  });

  it('rejects missing required variables', () => {
    const registry = createDefaultPromptRegistry();
    assert.throws(
      () => registry.render({ promptId: 'orchestrator.system', variables: {} }),
      PromptValidationError,
    );
  });
});
