import type { EmployeeCapability } from './capability';
import type { DashboardWidgetDef, SuggestedPromptDef } from './types';

export interface CapabilityTenantOverride {
  readonly enabled?: boolean;
  readonly priority?: number;
}

export interface CapabilityRegistryOptions {
  /** Future: tenant-level enable/disable and priority overrides. */
  readonly tenantOverrides?: Readonly<Record<string, CapabilityTenantOverride>>;
}

/**
 * Discovers Employee capabilities. Capabilities self-register at composition root.
 */
export class CapabilityRegistry {
  private readonly byId = new Map<string, EmployeeCapability>();
  private readonly overrides: Map<string, CapabilityTenantOverride>;

  constructor(options: CapabilityRegistryOptions = {}) {
    this.overrides = new Map(Object.entries(options.tenantOverrides ?? {}));
  }

  register(capability: EmployeeCapability): void {
    if (this.byId.has(capability.id)) {
      throw new Error(`Capability already registered: ${capability.id}`);
    }
    this.byId.set(capability.id, capability);
  }

  unregister(capabilityId: string): void {
    this.byId.delete(capabilityId);
  }

  get(capabilityId: string): EmployeeCapability | undefined {
    return this.byId.get(capabilityId);
  }

  list(includeDisabled = false): readonly EmployeeCapability[] {
    return [...this.byId.values()]
      .filter((c) => includeDisabled || this.isEnabled(c))
      .sort((a, b) => this.effectivePriority(b) - this.effectivePriority(a));
  }

  isEnabled(capability: EmployeeCapability): boolean {
    const override = this.overrides.get(capability.id);
    if (override?.enabled !== undefined) return override.enabled;
    return capability.enabled;
  }

  effectivePriority(capability: EmployeeCapability): number {
    const override = this.overrides.get(capability.id);
    return override?.priority ?? capability.priority;
  }

  setEnabled(capabilityId: string, enabled: boolean): void {
    const prior = this.overrides.get(capabilityId) ?? {};
    this.overrides.set(capabilityId, { ...prior, enabled });
  }

  setPriority(capabilityId: string, priority: number): void {
    const prior = this.overrides.get(capabilityId) ?? {};
    this.overrides.set(capabilityId, { ...prior, priority });
  }

  findByIntent(intent: string): EmployeeCapability | undefined {
    return this.list().find((c) => c.supportedIntents.includes(intent));
  }

  resolveForMessage(input: {
    readonly message: string;
    readonly intent?: string;
    readonly priorSlots?: Readonly<Record<string, unknown>>;
    readonly agentId?: string;
  }): EmployeeCapability | undefined {
    if (input.intent) {
      const byIntent = this.findByIntent(input.intent);
      if (byIntent) return byIntent;
    }
    for (const capability of this.list()) {
      if (
        capability.canHandle({
          message: input.message,
          ...(input.intent ? { intent: input.intent } : {}),
          ...(input.priorSlots ? { priorSlots: input.priorSlots } : {}),
          ...(input.agentId ? { agentId: input.agentId } : {}),
        })
      ) {
        return capability;
      }
    }
    return undefined;
  }

  allDashboardWidgets(): readonly DashboardWidgetDef[] {
    return this.list()
      .flatMap((c) => c.dashboardWidgets())
      .slice()
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  allSuggestedPrompts(): readonly SuggestedPromptDef[] {
    return this.list().flatMap((c) => c.suggestedPrompts());
  }

  allHelp(): readonly {
    readonly capabilityId: string;
    readonly help: ReturnType<EmployeeCapability['helpExamples']>;
  }[] {
    return this.list().map((c) => ({ capabilityId: c.id, help: c.helpExamples() }));
  }
}

export function createCapabilityRegistry(
  capabilities: readonly EmployeeCapability[] = [],
  options?: CapabilityRegistryOptions,
): CapabilityRegistry {
  const registry = new CapabilityRegistry(options);
  for (const capability of capabilities) {
    registry.register(capability);
  }
  return registry;
}
