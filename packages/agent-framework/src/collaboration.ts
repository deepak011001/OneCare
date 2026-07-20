import type { CollaborationRequest, CollaborationResult, EnterpriseAgent } from './types';
import type { EnterpriseAgentRegistry } from './registry';
import { AgentUnavailableError } from './errors';
import { assertAgentAccess } from './permissions';

/**
 * Cross-agent collaboration contract — framework only.
 * Does not implement business answers; validates access and records intent hand-off shape.
 */
export async function requestCollaboration(
  registry: EnterpriseAgentRegistry,
  request: CollaborationRequest,
): Promise<CollaborationResult> {
  const target = registry.get(request.targetAgentId);
  if (!target || !target.enabled) {
    throw new AgentUnavailableError(request.targetAgentId);
  }

  assertAgentAccess({
    agent: target,
    tenantId: request.context.tenantId,
    roles: request.context.roles,
    permissions: request.context.permissions,
    featureFlags: request.context.featureFlags,
  });

  request.context.telemetry?.record({
    type: 'agent.capability',
    agentId: request.requestingAgentId,
    tenantId: request.context.tenantId,
    detail: {
      collaboration: true,
      targetAgentId: request.targetAgentId,
      intent: request.intent,
    },
    at: new Date().toISOString(),
  });

  return {
    ok: true,
    fromAgentId: target.id,
    message: `Collaboration accepted by ${target.id} for intent ${request.intent}`,
    data: {
      targetCapabilities: target.supportedCapabilities.map((c) => c.id),
      payload: request.payload ?? {},
    },
  };
}

export function listCollaborators(
  registry: EnterpriseAgentRegistry,
  agent: EnterpriseAgent,
): readonly EnterpriseAgent[] {
  return registry.listEnabled().filter((a) => a.id !== agent.id);
}
