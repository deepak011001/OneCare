import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MockLlmProvider } from './mock-provider';

describe('MockLlmProvider', () => {
  it('completes and streams text', async () => {
    const provider = new MockLlmProvider();
    const complete = await provider.complete({
      model: 'mock-onecare-v1',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    assert.match(complete.text, /Hello/);
    let streamed = '';
    for await (const chunk of provider.stream({
      model: 'mock-onecare-v1',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      if (chunk.type === 'delta' && chunk.text) streamed += chunk.text;
    }
    assert.match(streamed, /Hello/);
  });
});
