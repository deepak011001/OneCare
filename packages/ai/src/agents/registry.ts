import { PLACEHOLDER_AGENTS, type DomainAgentId, type RegisteredAgent } from './catalog';

export interface AgentRegistryPort {
  register(agent: RegisteredAgent): void;
  get(id: DomainAgentId | string): RegisteredAgent | null;
  list(): readonly RegisteredAgent[];
  listEnabled(): readonly RegisteredAgent[];
}

export class InMemoryAgentRegistry implements AgentRegistryPort {
  private readonly agents = new Map<string, RegisteredAgent>();

  register(agent: RegisteredAgent): void {
    this.agents.set(agent.id, agent);
  }

  get(id: DomainAgentId | string): RegisteredAgent | null {
    return this.agents.get(id) ?? null;
  }

  list(): readonly RegisteredAgent[] {
    return [...this.agents.values()];
  }

  listEnabled(): readonly RegisteredAgent[] {
    return this.list().filter((a) => a.enabled);
  }
}

export function createDefaultAgentRegistry(): InMemoryAgentRegistry {
  const registry = new InMemoryAgentRegistry();
  for (const agent of PLACEHOLDER_AGENTS) {
    registry.register(agent);
  }
  return registry;
}
