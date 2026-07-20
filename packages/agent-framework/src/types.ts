/**
 * Enterprise Agent Framework — domain models (provider-agnostic).
 */

export type AgentHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export type AgentLifecyclePhase =
  | 'initialize'
  | 'beforePlanning'
  | 'beforeExecution'
  | 'afterExecution'
  | 'beforeResponse'
  | 'shutdown';

export interface AgentCapabilityRef {
  readonly id: string;
  readonly description: string;
}

export interface AgentMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly owner: string;
  readonly supportedCapabilities: readonly AgentCapabilityRef[];
  readonly requiredPermissions: readonly string[];
  readonly supportedRoles: readonly string[];
  readonly supportedTenants?: readonly string[];
  readonly featureFlags?: readonly string[];
  readonly priority: number;
  readonly supportedIntents: readonly string[];
  readonly allowedTools: readonly string[];
  readonly systemPromptRef: string;
  readonly enabled: boolean;
}

export interface AgentHealth {
  readonly agentId: string;
  readonly status: AgentHealthStatus;
  readonly detail?: string;
  readonly checkedAt: string;
}

export interface AgentMemorySlice {
  readonly conversation?: Readonly<Record<string, unknown>>;
  readonly working?: Readonly<Record<string, unknown>>;
  readonly shortTerm?: Readonly<Record<string, unknown>>;
  readonly summary?: string;
}

export interface AgentExecutionGraphSummary {
  readonly nodeCount: number;
  readonly kinds: readonly string[];
}

export interface AgentContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly conversationId?: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly memory: AgentMemorySlice;
  readonly executionGraph?: AgentExecutionGraphSummary;
  readonly telemetry?: AgentTelemetryPort;
  /** Opaque service handles — never global singletons. */
  readonly services: AgentContextServices;
}

export interface AgentContextServices {
  readonly knowledge?: unknown;
  readonly mcp?: unknown;
  readonly capabilityRegistry?: unknown;
  readonly [key: string]: unknown;
}

export interface AgentLifecycleHooks {
  initialize?(ctx: AgentContext): Promise<void> | void;
  beforePlanning?(ctx: AgentContext, message: string): Promise<void> | void;
  beforeExecution?(ctx: AgentContext): Promise<void> | void;
  afterExecution?(ctx: AgentContext, result: unknown): Promise<void> | void;
  beforeResponse?(ctx: AgentContext, result: unknown): Promise<unknown> | unknown;
  shutdown?(ctx: AgentContext): Promise<void> | void;
}

export interface EnterpriseAgent extends AgentMetadata {
  readonly lifecycle: AgentLifecycleHooks;
  health(): Promise<AgentHealth> | AgentHealth;
}

export interface AgentHandoffPayload {
  readonly fromAgentId: string;
  readonly toAgentId: string;
  readonly reason: string;
  readonly context: AgentContext;
  readonly executionState?: Readonly<Record<string, unknown>>;
  readonly pendingClarifications?: readonly string[];
  readonly pendingConfirmations?: readonly string[];
  readonly transferredAt: string;
}

export interface AgentHandoffResult {
  readonly ok: boolean;
  readonly handoffId: string;
  readonly auditId: string;
  readonly error?: string;
}

export interface CollaborationRequest {
  readonly requestingAgentId: string;
  readonly targetAgentId: string;
  readonly intent: string;
  readonly context: AgentContext;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface CollaborationResult {
  readonly ok: boolean;
  readonly fromAgentId: string;
  readonly data?: unknown;
  readonly message?: string;
}

export type ApprovalStatus =
  'pending' | 'approved' | 'rejected' | 'expired' | 'delegated' | 'escalated';

export interface ApprovalRequest {
  readonly id: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly requesterUserId: string;
  readonly approverUserIds: readonly string[];
  readonly action: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: ApprovalStatus;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly delegatedTo?: string;
  readonly escalatedTo?: string;
}

export interface AgentTelemetryEvent {
  readonly type:
    | 'agent.selected'
    | 'agent.lifecycle'
    | 'agent.handoff'
    | 'agent.failure'
    | 'agent.execution'
    | 'agent.capability'
    | 'agent.latency';
  readonly agentId: string;
  readonly tenantId?: string;
  readonly durationMs?: number;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly at: string;
}

export interface AgentTelemetryPort {
  record(event: AgentTelemetryEvent): void;
  snapshot(): {
    readonly selected: number;
    readonly executions: number;
    readonly failures: number;
    readonly handoffs: number;
    readonly lifecycleMsTotal: number;
    readonly events: readonly AgentTelemetryEvent[];
  };
}

export interface AgentMemoryPort {
  getConversation(key: string): Promise<Readonly<Record<string, unknown>> | null>;
  setConversation(key: string, value: Readonly<Record<string, unknown>>): Promise<void>;
  getWorking(key: string): Promise<Readonly<Record<string, unknown>> | null>;
  setWorking(key: string, value: Readonly<Record<string, unknown>>): Promise<void>;
  getShortTerm(key: string): Promise<Readonly<Record<string, unknown>> | null>;
  setShortTerm(key: string, value: Readonly<Record<string, unknown>>): Promise<void>;
  getSummary(key: string): Promise<string | null>;
  setSummary(key: string, summary: string): Promise<void>;
  /** Future long-term / vector memory hook — not implemented in M6.5. */
  retrieve?(query: string): Promise<readonly unknown[]>;
}

export interface AgentAccessInput {
  readonly agent: EnterpriseAgent;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly featureFlags?: Readonly<Record<string, boolean>>;
}
