export type FlagScope = 'system' | 'tenant' | 'user';

export interface FlagEvaluationContext {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly roles?: readonly string[];
}

export interface FeatureFlagPort {
  isEnabled(key: string, context?: FlagEvaluationContext, defaultEnabled?: boolean): Promise<boolean>;
  getValue<T = unknown>(
    key: string,
    context?: FlagEvaluationContext,
    defaultValue?: T,
  ): Promise<T | undefined>;
  /** Kill switch — when false, feature must not execute. */
  isKillSwitchOpen(key: string, context?: FlagEvaluationContext): Promise<boolean>;
}

/** Well-known platform flags — no business logic, only gates. */
export const PLATFORM_FLAGS = {
  AGENTS_EMPLOYEE_ENABLED: 'agents.employee.enabled',
  CAPABILITY_LEAVE_ENABLED: 'capability.ess.leave.enabled',
  CAPABILITY_ATTENDANCE_ENABLED: 'capability.ess.attendance.enabled',
  CAPABILITY_KNOWLEDGE_ENABLED: 'capability.ess.knowledge.enabled',
  CROSS_ORCHESTRATION_ENABLED: 'ai.cross_orchestration.enabled',
  MCP_EXECUTE_ENABLED: 'mcp.execute.enabled',
  PREVIEW_STREAMING_V2: 'preview.streaming.v2',
  KILL_AI_CHAT: 'killswitch.ai.chat',
  KILL_MCP_EXECUTE: 'killswitch.mcp.execute',
} as const;
