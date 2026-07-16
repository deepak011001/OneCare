import type { RequestContext } from '@onecare/shared';
import type { ToolRisk } from '@onecare/mcp';

export const AGENT_IDS = [
  'orchestrator',
  'ess',
  'mss',
  'hr',
  'payroll',
  'attendance',
  'it',
  'finance',
  'knowledge',
  'recruitment',
  'learning',
  'analytics',
  'notification',
  'workflow',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentPlanStep {
  readonly id: string;
  readonly action: string;
  readonly tool?: string;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly requiresConfirmation: boolean;
  readonly risk: ToolRisk;
}

export interface AgentDefinition {
  readonly id: AgentId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly allowedTools: readonly string[];
  readonly systemPromptRef: string;
  readonly enabled: boolean;
}

export type AgentRunStatus =
  | 'completed'
  | 'needs_input'
  | 'needs_confirmation'
  | 'failed'
  | 'delegated';

export interface AgentResult {
  readonly status: AgentRunStatus;
  readonly message: string;
  readonly data?: unknown;
  readonly plan?: readonly AgentPlanStep[];
}

export interface AgentPort {
  readonly definition: AgentDefinition;
  run(input: {
    readonly message: string;
    readonly context: RequestContext;
  }): Promise<AgentResult>;
}
