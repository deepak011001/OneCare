import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asTenantId, asUserId } from '@onecare/shared';
import { InMemoryConfirmationStore } from './store';

describe('confirmations', () => {
  it('approves a pending confirmation', async () => {
    const store = new InMemoryConfirmationStore();
    const created = await store.create({
      tenantId: asTenantId('t1'),
      userId: asUserId('u1'),
      connectorId: 'keka',
      toolName: 'applyLeave',
      arguments: { startDate: '2026-08-01' },
      summary: 'Apply leave',
    });
    const approved = await store.approve(asTenantId('t1'), created.id, asUserId('u1'));
    assert.equal(approved?.status, 'approved');
  });
});
