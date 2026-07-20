/** Shared slot bag used across Employee capabilities. */
export type SlotBag = Readonly<Record<string, unknown>>;

export type EntityKind =
  | 'date'
  | 'dateRange'
  | 'relativeDate'
  | 'employee'
  | 'department'
  | 'leaveType'
  | 'reason'
  | 'policyName'
  | 'document'
  | 'location'
  | 'benefit'
  | 'role'
  | 'country'
  | 'office'
  | 'manager'
  | 'keyword'
  | 'ticket'
  | 'amount'
  | 'halfDay'
  | 'requestId'
  | 'text'
  | 'custom';

export interface EntityDeclaration {
  readonly id: string;
  readonly kind: EntityKind;
  readonly slotKey: string;
  readonly label?: string;
  readonly requiredForIntents?: readonly string[];
  /** Clarification copy when this slot is missing. */
  readonly clarifyQuestion?: string;
  readonly suggestedReplies?: readonly string[];
}

export interface CapabilityHandleInput {
  readonly message: string;
  readonly intent?: string;
  readonly priorSlots?: SlotBag;
  readonly agentId?: string;
}

export interface CapabilityTurnInput {
  readonly message: string;
  readonly intent?: string;
  readonly priorSlots?: SlotBag;
  readonly now?: Date;
  readonly context?: CapabilityRuntimeContext;
  readonly extras?: Readonly<Record<string, unknown>>;
}

export interface CapabilityRuntimeContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly severity?: 'error' | 'warning';
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface ClarificationResult {
  readonly question: string;
  readonly missing: readonly string[];
  readonly suggestedReplies?: readonly string[];
  readonly slots: SlotBag;
}

export interface ExecutionPlan {
  readonly intent: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly requiresConfirmation: boolean;
  readonly slots: SlotBag;
  readonly risk?: 'low' | 'medium' | 'high';
}

export interface ConfirmationDraft {
  readonly summary: string;
  readonly risk: 'low' | 'medium' | 'high';
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly actions?: readonly { readonly id: string; readonly label: string }[];
}

export interface CapabilityToolExecuteRequest {
  readonly toolName: string;
  readonly connectorId?: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly context: CapabilityRuntimeContext;
  readonly confirmationApproved: boolean;
}

export interface CapabilityToolExecuteResult {
  readonly ok: boolean;
  readonly data?: unknown;
  readonly errorMessage?: string;
  readonly decision?: string;
  readonly confirmationId?: string;
}

export interface CapabilityToolPort {
  execute(request: CapabilityToolExecuteRequest): Promise<CapabilityToolExecuteResult>;
  getTool?(
    toolName: string,
  ): { readonly implemented: boolean; readonly connectorId?: string } | undefined;
}

export interface CapabilityExecuteInput {
  readonly plan: ExecutionPlan;
  readonly context: CapabilityRuntimeContext;
  readonly confirmationApproved: boolean;
  readonly tools: CapabilityToolPort;
}

export type CapabilityExecuteResult =
  | {
      readonly kind: 'completed';
      readonly data?: unknown;
    }
  | {
      readonly kind: 'confirmation_required';
      readonly confirmationId?: string;
      readonly summary: string;
    }
  | {
      readonly kind: 'failed';
      readonly message: string;
    }
  | {
      readonly kind: 'delegated';
      readonly plan: ExecutionPlan;
      readonly confirmation?: ConfirmationDraft;
    };

export type ResponseBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'suggestions'; readonly replies: readonly string[] }
  | {
      readonly type: 'table';
      readonly columns: readonly string[];
      readonly rows: readonly (readonly string[])[];
    }
  | {
      readonly type: 'timeline';
      readonly items: readonly { readonly title: string; readonly subtitle?: string }[];
    }
  | { readonly type: 'card'; readonly title: string; readonly body: string }
  | {
      readonly type: 'quick_actions';
      readonly actions: readonly { readonly id: string; readonly label: string }[];
    }
  | { readonly type: 'tool_result'; readonly toolName: string; readonly data: unknown };

export interface CapabilityResponse {
  readonly text: string;
  readonly blocks: readonly ResponseBlock[];
  readonly suggestedReplies?: readonly string[];
}

export interface DashboardWidgetDef {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly route?: string;
  readonly order?: number;
  readonly requiredPermissions?: readonly string[];
}

export interface SuggestedPromptDef {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly kind: 'starter' | 'follow_up' | 'quick_action' | 'dashboard';
}

export interface CapabilityHelp {
  readonly description: string;
  readonly examples: readonly string[];
  readonly supportedActions: readonly string[];
  readonly limitations: readonly string[];
  readonly requiredPermissions: readonly string[];
}

export interface CapabilityTelemetryDescriptor {
  readonly capabilityId: string;
  readonly metricsPrefix: string;
}

export type CapabilityLifecycleOutcome =
  | {
      readonly kind: 'clarify';
      readonly capabilityId: string;
      readonly intent: string;
      readonly question: string;
      readonly missing: readonly string[];
      readonly slots: SlotBag;
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'ready';
      readonly capabilityId: string;
      readonly plan: ExecutionPlan;
      readonly confirmation?: ConfirmationDraft;
    }
  | {
      readonly kind: 'invalid';
      readonly capabilityId: string;
      readonly intent: string;
      readonly message: string;
      readonly issues: readonly ValidationIssue[];
      readonly suggestedReplies?: readonly string[];
      readonly slots: SlotBag;
    }
  | {
      readonly kind: 'unsupported';
      readonly capabilityId?: string;
      readonly message: string;
    };
