import type { EnterpriseAgent } from './types';
import {
  createEmptyEnterpriseAgentRegistry,
  type InMemoryEnterpriseAgentRegistry,
} from './registry';
import { createCatalogEnterpriseAgents } from './agents/catalog';
import { InMemoryAgentTelemetry } from './telemetry';
import { InMemoryAgentMemory } from './memory';
import { InMemoryAgentHandoffBus } from './handoff';
import { InMemoryApprovalStore } from './approval';

export interface EnterpriseAgentPlatform {
  readonly registry: InMemoryEnterpriseAgentRegistry;
  readonly telemetry: InMemoryAgentTelemetry;
  readonly memory: InMemoryAgentMemory;
  readonly handoffs: InMemoryAgentHandoffBus;
  readonly approvals: InMemoryApprovalStore;
}

/** Composition root for the Enterprise Agent Framework. */
export function createEnterpriseAgentPlatform(): EnterpriseAgentPlatform {
  const telemetry = new InMemoryAgentTelemetry();
  const registry = createEmptyEnterpriseAgentRegistry();
  for (const agent of createCatalogEnterpriseAgents()) {
    registry.register(agent);
  }
  return {
    registry,
    telemetry,
    memory: new InMemoryAgentMemory(),
    handoffs: new InMemoryAgentHandoffBus(telemetry),
    approvals: new InMemoryApprovalStore(),
  };
}

/**
 * Compatibility projection for the AI Runtime agent catalog.
 * Keeps Master Orchestrator / RegisteredAgent shape unchanged.
 */
export function toRuntimeRegisteredAgent(agent: EnterpriseAgent): {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedIntents: readonly string[];
  readonly capabilities: readonly { readonly id: string; readonly description: string }[];
  readonly allowedTools: readonly string[];
  readonly systemPromptRef: string;
  readonly enabled: boolean;
} {
  return {
    id: agent.id,
    name: agent.name,
    version: agent.version,
    description: agent.description,
    supportedIntents: agent.supportedIntents,
    capabilities: agent.supportedCapabilities,
    allowedTools: agent.allowedTools,
    systemPromptRef: agent.systemPromptRef,
    enabled: agent.enabled,
  };
}
