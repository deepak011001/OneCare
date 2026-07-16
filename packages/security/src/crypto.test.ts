import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateOpaqueToken, hashToken, safeEqualHex } from './crypto';

describe('crypto', () => {
  it('hashes tokens deterministically', () => {
    const token = generateOpaqueToken();
    assert.equal(hashToken(token), hashToken(token));
    assert.notEqual(hashToken(token), hashToken(`${token}x`));
  });

  it('compares hashes safely', () => {
    const hash = hashToken('secret');
    assert.equal(safeEqualHex(hash, hash), true);
    assert.equal(safeEqualHex(hash, hashToken('other')), false);
  });
});
