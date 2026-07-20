import type { AgentContext, AgentContextServices, AgentMemorySlice } from './types';
import { ContextError } from './errors';

export interface CreateAgentContextInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly featureFlags?: Readonly<Record<string, boolean>>;
  readonly conversationId?: string;
  readonly memory?: AgentMemorySlice;
  readonly services?: AgentContextServices;
  readonly executionGraph?: AgentContext['executionGraph'];
  readonly telemetry?: AgentContext['telemetry'];
}

/** Build a request-scoped AgentContext — no ambient/global state. */
export function createAgentContext(input: CreateAgentContextInput): AgentContext {
  if (!input.tenantId) throw new ContextError('tenantId is required');
  if (!input.userId) throw new ContextError('userId is required');
  if (!input.sessionId) throw new ContextError('sessionId is required');

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    sessionId: input.sessionId,
    requestId: input.requestId,
    correlationId: input.correlationId,
    roles: input.roles,
    permissions: input.permissions,
    attributes: input.attributes ?? {},
    featureFlags: input.featureFlags ?? {},
    memory: input.memory ?? {},
    services: input.services ?? {},
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.executionGraph ? { executionGraph: input.executionGraph } : {}),
    ...(input.telemetry ? { telemetry: input.telemetry } : {}),
  };
}
