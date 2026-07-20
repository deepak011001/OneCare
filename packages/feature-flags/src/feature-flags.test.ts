import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryFeatureFlagService } from './in-memory';
import { PLATFORM_FLAGS } from './types';

describe('feature-flags', () => {
  it('resolves tenant override over system default', async () => {
    const flags = new InMemoryFeatureFlagService([
      { key: PLATFORM_FLAGS.CAPABILITY_LEAVE_ENABLED, scope: 'system', enabled: true },
      {
        key: PLATFORM_FLAGS.CAPABILITY_LEAVE_ENABLED,
        scope: 'tenant',
        tenantId: 't1',
        enabled: false,
      },
    ]);
    assert.equal(await flags.isEnabled(PLATFORM_FLAGS.CAPABILITY_LEAVE_ENABLED), true);
    assert.equal(
      await flags.isEnabled(PLATFORM_FLAGS.CAPABILITY_LEAVE_ENABLED, { tenantId: 't1' }),
      false,
    );
  });

  it('treats killswitch engaged as closed', async () => {
    const flags = new InMemoryFeatureFlagService([
      { key: PLATFORM_FLAGS.KILL_AI_CHAT, scope: 'system', enabled: true },
    ]);
    assert.equal(await flags.isKillSwitchOpen(PLATFORM_FLAGS.KILL_AI_CHAT), false);
  });
});
