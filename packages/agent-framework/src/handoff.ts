import { randomUUID } from 'node:crypto';
import type { AgentHandoffPayload, AgentHandoffResult, AgentTelemetryPort } from './types';
import { HandoffFailedError } from './errors';

export interface AgentHandoffPort {
  transfer(payload: AgentHandoffPayload): Promise<AgentHandoffResult>;
  list(tenantId: string): Promise<readonly (AgentHandoffPayload & { id: string })[]>;
}

/** Framework-only handoff bus — no business routing logic. */
export class InMemoryAgentHandoffBus implements AgentHandoffPort {
  private readonly items: (AgentHandoffPayload & { id: string; auditId: string })[] = [];

  constructor(private readonly telemetry?: AgentTelemetryPort) {}

  async transfer(payload: AgentHandoffPayload): Promise<AgentHandoffResult> {
    if (!payload.fromAgentId || !payload.toAgentId) {
      throw new HandoffFailedError('fromAgentId and toAgentId are required');
    }
    if (payload.fromAgentId === payload.toAgentId) {
      throw new HandoffFailedError('Cannot hand off to the same agent');
    }
    const id = randomUUID();
    const auditId = randomUUID();
    this.items.push({ ...payload, id, auditId });
    this.telemetry?.record({
      type: 'agent.handoff',
      agentId: payload.fromAgentId,
      tenantId: payload.context.tenantId,
      detail: { toAgentId: payload.toAgentId, reason: payload.reason, handoffId: id },
      at: new Date().toISOString(),
    });
    return { ok: true, handoffId: id, auditId };
  }

  async list(tenantId: string) {
    return this.items.filter((i) => i.context.tenantId === tenantId);
  }
}
