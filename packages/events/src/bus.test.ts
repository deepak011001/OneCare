import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DOMAIN_EVENTS, InProcessEventBus } from './bus';

describe('InProcessEventBus', () => {
  it('delivers published events to subscribers', async () => {
    const bus = new InProcessEventBus();
    let seen = false;
    bus.subscribe(DOMAIN_EVENTS.USER_LOGGED_IN, async () => {
      seen = true;
    });
    await bus.publish({
      name: DOMAIN_EVENTS.USER_LOGGED_IN,
      occurredAt: new Date(),
      payload: { userId: 'u1' },
    });
    assert.equal(seen, true);
  });
});
