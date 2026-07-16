import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { err, ok } from './result';

describe('result', () => {
  it('wraps success values', () => {
    const result = ok(42);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, 42);
    }
  });

  it('wraps errors', () => {
    const result = err(new Error('boom'));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.message, 'boom');
    }
  });
});
