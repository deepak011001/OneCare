import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInMemoryFacade } from './in-memory';

describe('memory facade', () => {
  it('loads, saves, summarizes, and forgets', async () => {
    const memory = createInMemoryFacade();
    const scope = { tenantId: 't1', userId: 'u1' };
    await memory.user.save(scope, 'pref.theme', 'dark');
    const loaded = await memory.user.load(scope, 'pref.theme');
    assert.equal(loaded?.value, 'dark');
    const summarized = await memory.user.summarize(scope, 'pref.theme');
    assert.equal(summarized?.summary, 'dark');
    await memory.user.forget(scope, 'pref.theme');
    assert.equal(await memory.user.load(scope, 'pref.theme'), null);
  });
});
