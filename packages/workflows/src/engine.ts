import type { TenantId, UserId } from '@onecare/shared';

export type WorkflowInstanceStatus =
  | 'created'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface WorkflowDefinitionRef {
  readonly code: string;
  readonly version: number;
}

export interface StartWorkflowCommand {
  readonly tenantId: TenantId;
  readonly definition: WorkflowDefinitionRef;
  readonly startedBy: UserId;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly context: Readonly<Record<string, unknown>>;
}

/** Port for durable workflow engine (implemented in apps/api or workers). */
export interface WorkflowEnginePort {
  start(command: StartWorkflowCommand): Promise<{ instanceId: string }>;
  signal(input: {
    readonly tenantId: TenantId;
    readonly instanceId: string;
    readonly signal: string;
    readonly payload?: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}
