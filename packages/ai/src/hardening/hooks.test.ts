import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AllowAllSafetyHook,
  DefaultContextGuard,
  DefaultTokenBudget,
  createDefaultAiHardening,
} from './hooks';

describe('ai hardening hooks', () => {
  it('preserves short context and truncates long context', () => {
    const guard = new DefaultContextGuard();
    assert.equal(guard.enforce({ text: 'hello', maxChars: 100 }), 'hello');
    const long = 'x'.repeat(50);
    const out = guard.enforce({ text: long, maxChars: 20 });
    assert.ok(out.includes('truncated'));
    assert.ok(out.length <= 20);
  });

  it('enforces token budget', () => {
    const budget = new DefaultTokenBudget();
    assert.equal(
      budget.allow({ estimatedPromptTokens: 100, maxTokens: 50, budget: 200 }),
      true,
    );
    assert.equal(
      budget.allow({ estimatedPromptTokens: 180, maxTokens: 50, budget: 200 }),
      false,
    );
  });

  it('allow-all safety hook permits traffic', async () => {
    const safety = new AllowAllSafetyHook();
    const result = await safety.check({ message: 'hi' });
    assert.equal(result.allowed, true);
    const ports = createDefaultAiHardening();
    ports.promptTelemetry.recordRender({ promptId: 'x', version: '1.0.0' });
  });
});
