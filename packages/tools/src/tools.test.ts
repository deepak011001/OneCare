import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDefaultToolRegistry } from './registry';

describe('tool registry', () => {
  it('registers legacy placeholder tools without implementations', () => {
    const registry = createDefaultToolRegistry();
    const tools = registry.list();
    assert.ok(tools.length >= 4);
    assert.equal(registry.get('searchKnowledge')?.implemented, false);
    assert.equal(registry.get('searchKnowledge')?.name, 'searchKnowledge');
  });
});
