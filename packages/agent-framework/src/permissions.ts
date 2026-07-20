import type { AgentAccessInput } from './types';
import { AgentNotAuthorizedError } from './errors';

export function assertAgentAccess(input: AgentAccessInput): void {
  const { agent, tenantId, roles, permissions, featureFlags } = input;

  if (!agent.enabled) {
    throw new AgentNotAuthorizedError(agent.id, 'Agent is disabled');
  }

  if (agent.supportedTenants?.length && !agent.supportedTenants.includes(tenantId)) {
    throw new AgentNotAuthorizedError(agent.id, 'Tenant not supported');
  }

  if (agent.supportedRoles.length) {
    const ok = agent.supportedRoles.some((r) => roles.includes(r));
    if (!ok) {
      throw new AgentNotAuthorizedError(agent.id, 'Missing required role');
    }
  }

  if (agent.requiredPermissions.length) {
    const missing = agent.requiredPermissions.filter((p) => !permissions.includes(p));
    if (missing.length) {
      throw new AgentNotAuthorizedError(agent.id, `Missing permissions: ${missing.join(', ')}`);
    }
  }

  if (agent.featureFlags?.length && featureFlags) {
    for (const flag of agent.featureFlags) {
      if (featureFlags[flag] === false) {
        throw new AgentNotAuthorizedError(agent.id, `Feature flag disabled: ${flag}`);
      }
    }
  }
}

export function canAccessAgent(input: AgentAccessInput): boolean {
  try {
    assertAgentAccess(input);
    return true;
  } catch {
    return false;
  }
}
