export type PlanMode = 'single_agent' | 'multi_agent' | 'parallel' | 'human_approval';

export type PlanStepStatus = 'pending' | 'ready' | 'blocked' | 'completed' | 'failed' | 'skipped';

export interface PlannerContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly conversationId?: string;
  readonly recentMessages?: readonly { role: string; content: string }[];
}

export interface PlanStep {
  readonly id: string;
  readonly agentId: string;
  readonly intent: string;
  readonly rationale: string;
  readonly requiresConfirmation: boolean;
  readonly risk: 'low' | 'medium' | 'high' | 'critical';
  readonly status: PlanStepStatus;
  readonly toolNames?: readonly string[];
  /** Reserved for future parallel execution groups */
  readonly parallelGroup?: string;
}

export interface ExecutionPlan {
  readonly id: string;
  readonly mode: PlanMode;
  readonly steps: readonly PlanStep[];
  readonly summary: string;
  readonly createdAt: Date;
  /** Future: pause for human approval before mutating steps */
  readonly requiresHumanApproval: boolean;
}

export interface PlannerInput {
  readonly message: string;
  readonly context: PlannerContext;
}

export interface PlannerPort {
  plan(input: PlannerInput): Promise<ExecutionPlan>;
}
