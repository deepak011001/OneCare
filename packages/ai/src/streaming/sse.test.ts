import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SseStreamController } from './sse';

describe('SseStreamController', () => {
  it('emits sequenced events and supports cancel', () => {
    const controller = new SseStreamController();
    const events: string[] = [];
    controller.onEvent((e) => events.push(e.type));
    controller.emit({ type: 'delta', data: { text: 'Hi' } });
    controller.cancel('stop');
    assert.deepEqual(events, ['delta', 'cancelled']);
    assert.equal(controller.signal.aborted, true);
    const formatted = controller.formatSse({
      type: 'delta',
      sequence: 1,
      data: { text: 'x' },
    });
    assert.match(formatted, /^event: delta/);
  });
});
