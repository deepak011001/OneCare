import type { AgentHealth, AgentHealthStatus, EnterpriseAgent } from './types';
import { AgentUnavailableError } from './errors';
import { mergeLifecycleHooks } from './lifecycle';

export interface EnterpriseAgentRegistry {
  register(agent: EnterpriseAgent): void;
  unregister(agentId: string): void;
  get(agentId: string): EnterpriseAgent | null;
  list(includeDisabled?: boolean): readonly EnterpriseAgent[];
  listEnabled(): readonly EnterpriseAgent[];
  findByRole(role: string): readonly EnterpriseAgent[];
  findByCapability(capabilityId: string): readonly EnterpriseAgent[];
  enable(agentId: string): void;
  disable(agentId: string): void;
  setTenantOverride(tenantId: string, agentId: string, enabled: boolean): void;
  isEnabledForTenant(agentId: string, tenantId: string): boolean;
  health(agentId?: string): Promise<readonly AgentHealth[]>;
}

type RegistryEntry = {
  agent: EnterpriseAgent;
  /** tenantId → enabled override */
  tenantOverrides: Map<string, boolean>;
};

export class InMemoryEnterpriseAgentRegistry implements EnterpriseAgentRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  register(agent: EnterpriseAgent): void {
    const lifecycle = mergeLifecycleHooks(agent.lifecycle);
    this.entries.set(agent.id, {
      agent: { ...agent, lifecycle },
      tenantOverrides: this.entries.get(agent.id)?.tenantOverrides ?? new Map(),
    });
  }

  unregister(agentId: string): void {
    this.entries.delete(agentId);
  }

  get(agentId: string): EnterpriseAgent | null {
    return this.entries.get(agentId)?.agent ?? null;
  }

  list(includeDisabled = true): readonly EnterpriseAgent[] {
    const all = [...this.entries.values()].map((e) => e.agent);
    return includeDisabled ? all : all.filter((a) => a.enabled);
  }

  listEnabled(): readonly EnterpriseAgent[] {
    return this.list(false);
  }

  findByRole(role: string): readonly EnterpriseAgent[] {
    return this.listEnabled().filter((a) => a.supportedRoles.includes(role));
  }

  findByCapability(capabilityId: string): readonly EnterpriseAgent[] {
    return this.listEnabled().filter((a) =>
      a.supportedCapabilities.some((c) => c.id === capabilityId),
    );
  }

  enable(agentId: string): void {
    const entry = this.require(agentId);
    entry.agent = { ...entry.agent, enabled: true };
  }

  disable(agentId: string): void {
    const entry = this.require(agentId);
    entry.agent = { ...entry.agent, enabled: false };
  }

  setTenantOverride(tenantId: string, agentId: string, enabled: boolean): void {
    const entry = this.require(agentId);
    entry.tenantOverrides.set(tenantId, enabled);
  }

  isEnabledForTenant(agentId: string, tenantId: string): boolean {
    const entry = this.entries.get(agentId);
    if (!entry) return false;
    const override = entry.tenantOverrides.get(tenantId);
    if (override !== undefined) return override;
    return entry.agent.enabled;
  }

  async health(agentId?: string): Promise<readonly AgentHealth[]> {
    const agents = agentId
      ? [this.get(agentId)].filter((a): a is EnterpriseAgent => Boolean(a))
      : this.list(true);

    if (agentId && agents.length === 0) {
      throw new AgentUnavailableError(agentId);
    }

    const results: AgentHealth[] = [];
    for (const agent of agents) {
      try {
        const h = await agent.health();
        results.push(h);
      } catch (err) {
        results.push({
          agentId: agent.id,
          status: 'unavailable',
          detail: err instanceof Error ? err.message : String(err),
          checkedAt: new Date().toISOString(),
        });
      }
    }
    return results;
  }

  private require(agentId: string): RegistryEntry {
    const entry = this.entries.get(agentId);
    if (!entry) throw new AgentUnavailableError(agentId);
    return entry;
  }
}

export function createEmptyEnterpriseAgentRegistry(): InMemoryEnterpriseAgentRegistry {
  return new InMemoryEnterpriseAgentRegistry();
}

export function healthyStatus(
  agentId: string,
  status: AgentHealthStatus = 'healthy',
  detail?: string,
): AgentHealth {
  return {
    agentId,
    status,
    checkedAt: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  };
}
