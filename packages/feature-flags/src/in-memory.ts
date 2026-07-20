import { featureFlagLookupKey } from '@onecare/database';
import type { FeatureFlagPort, FlagEvaluationContext } from './types';
import { PLATFORM_FLAGS } from './types';

export interface InMemoryFlagRecord {
  readonly key: string;
  readonly scope: 'system' | 'tenant' | 'user';
  readonly tenantId?: string;
  readonly userId?: string;
  readonly enabled: boolean;
  readonly value?: unknown;
}

/**
 * In-memory flag store for tests and local bootstrapping.
 * Resolution order: user → tenant → system → default.
 */
export class InMemoryFeatureFlagService implements FeatureFlagPort {
  private readonly flags = new Map<string, InMemoryFlagRecord>();

  constructor(seed: readonly InMemoryFlagRecord[] = defaultPlatformFlags()) {
    for (const flag of seed) {
      this.set(flag);
    }
  }

  set(flag: InMemoryFlagRecord): void {
    const lookup = featureFlagLookupKey(
      flag.scope,
      flag.key,
      flag.scope === 'tenant' ? flag.tenantId : flag.scope === 'user' ? flag.userId : undefined,
    );
    this.flags.set(lookup, flag);
  }

  async isEnabled(
    key: string,
    context?: FlagEvaluationContext,
    defaultEnabled = true,
  ): Promise<boolean> {
    const resolved = this.resolve(key, context);
    return resolved?.enabled ?? defaultEnabled;
  }

  async getValue<T = unknown>(
    key: string,
    context?: FlagEvaluationContext,
    defaultValue?: T,
  ): Promise<T | undefined> {
    const resolved = this.resolve(key, context);
    if (resolved?.value !== undefined) return resolved.value as T;
    return defaultValue;
  }

  async isKillSwitchOpen(key: string, context?: FlagEvaluationContext): Promise<boolean> {
    // Kill switch "open" means traffic is allowed (flag enabled=true or unset).
    // When killswitch flag is set enabled=true it means "kill engaged" for PLATFORM kill keys.
    if (key.startsWith('killswitch.')) {
      const engaged = await this.isEnabled(key, context, false);
      return !engaged;
    }
    return this.isEnabled(key, context, true);
  }

  private resolve(key: string, context?: FlagEvaluationContext): InMemoryFlagRecord | undefined {
    if (context?.userId) {
      const user = this.flags.get(featureFlagLookupKey('user', key, context.userId));
      if (user) return user;
    }
    if (context?.tenantId) {
      const tenant = this.flags.get(featureFlagLookupKey('tenant', key, context.tenantId));
      if (tenant) return tenant;
    }
    return this.flags.get(featureFlagLookupKey('system', key));
  }
}

function defaultPlatformFlags(): InMemoryFlagRecord[] {
  return Object.values(PLATFORM_FLAGS).map((key) => ({
    key,
    scope: 'system' as const,
    enabled: !key.startsWith('killswitch.'),
  }));
}
