import { Inject, Injectable } from '@nestjs/common';
import type { EnterpriseAgentPlatform } from '@onecare/agent-framework';
import { toRuntimeRegisteredAgent } from '@onecare/agent-framework';
import type { AiRuntime } from '@onecare/ai';
import type { RequestContext } from '@onecare/shared';
import { DomainError } from '@onecare/shared';
import { AI_TOKENS } from '../../ai/ai.tokens';

@Injectable()
export class AgentsAdminService {
  constructor(@Inject(AI_TOKENS.RUNTIME) private readonly runtime: AiRuntime) {}

  private platform(): EnterpriseAgentPlatform {
    return this.runtime.agentPlatform;
  }

  private assertAdmin(context: RequestContext) {
    if (!context.permissions.includes('ai.agents.read')) {
      throw new DomainError('FORBIDDEN', 'Missing permission: ai.agents.read');
    }
  }

  list(context: RequestContext) {
    this.assertAdmin(context);
    return this.platform()
      .registry.list(true)
      .map((a) => ({
        ...toRuntimeRegisteredAgent(a),
        owner: a.owner,
        priority: a.priority,
        requiredPermissions: a.requiredPermissions,
        supportedRoles: a.supportedRoles,
        featureFlags: a.featureFlags ?? [],
        version: a.version,
      }));
  }

  get(context: RequestContext, id: string) {
    this.assertAdmin(context);
    const agent = this.platform().registry.get(id);
    if (!agent) {
      throw new DomainError('NOT_FOUND', `Agent not found: ${id}`);
    }
    return {
      ...toRuntimeRegisteredAgent(agent),
      owner: agent.owner,
      priority: agent.priority,
      requiredPermissions: agent.requiredPermissions,
      supportedRoles: agent.supportedRoles,
      featureFlags: agent.featureFlags ?? [],
      tenantEnabled: this.platform().registry.isEnabledForTenant(id, String(context.tenantId)),
    };
  }

  async health(context: RequestContext) {
    this.assertAdmin(context);
    return this.platform().registry.health();
  }

  capabilities(context: RequestContext) {
    this.assertAdmin(context);
    const map = new Map<string, { id: string; description: string; agents: string[] }>();
    for (const agent of this.platform().registry.listEnabled()) {
      for (const cap of agent.supportedCapabilities) {
        const existing = map.get(cap.id);
        if (existing) {
          existing.agents.push(agent.id);
        } else {
          map.set(cap.id, {
            id: cap.id,
            description: cap.description,
            agents: [agent.id],
          });
        }
      }
    }
    return [...map.values()];
  }
}
