import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asTenantId, asUserId } from '@onecare/shared';
import { InMemoryConversationStore } from './store';

describe('InMemoryConversationStore', () => {
  it('creates, appends, and lists conversations', async () => {
    const store = new InMemoryConversationStore();
    const tenantId = asTenantId('t1');
    const userId = asUserId('u1');
    const created = await store.create({ tenantId, userId, title: 'Hello' });
    assert.equal(created.title, 'Hello');
    const withMsg = await store.appendMessage({
      conversationId: created.id,
      tenantId,
      role: 'user',
      content: 'Hi',
    });
    assert.equal(withMsg.messages.length, 1);
    assert.equal(withMsg.messages[0]?.role, 'user');
    const listed = await store.listByUser('t1', 'u1');
    assert.equal(listed.length, 1);
  });
});
