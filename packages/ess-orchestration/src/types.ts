import type {
  CapabilityRuntimeContext,
  CapabilityToolPort,
  ClarificationResult,
  ConfirmationDraft,
  ExecutionPlan,
  SlotBag,
} from '@onecare/ess-capability';

export type GraphNodeKind = 'read' | 'write' | 'knowledge' | 'clarify' | 'confirm' | 'unknown';

export type GraphNodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'waiting_clarification'
  | 'waiting_confirmation'
  | 'timed_out'
  | 'retrying';

export type ExecutionMode = 'parallel' | 'sequential' | 'conditional' | 'dependent';

export interface IntentSegment {
  readonly id: string;
  readonly text: string;
  readonly order: number;
}

export interface CapabilitySelection {
  readonly capabilityId: string;
  readonly capabilityName: string;
  readonly intent?: string;
  readonly confidence: number;
  readonly reason: string;
  readonly alternatives?: readonly string[];
  readonly segmentId: string;
  readonly segmentText: string;
}

export interface ExecutionGraphNode {
  readonly id: string;
  readonly capabilityId: string;
  readonly capabilityName: string;
  readonly segmentId: string;
  readonly segmentText: string;
  readonly intent?: string;
  readonly kind: GraphNodeKind;
  readonly mode: ExecutionMode;
  readonly dependsOn: readonly string[];
  readonly priority: number;
  readonly requiresConfirmation: boolean;
  status: GraphNodeStatus;
  plan?: ExecutionPlan;
  clarification?: ClarificationResult;
  confirmation?: ConfirmationDraft;
  slots?: SlotBag;
  resultText?: string;
  errorMessage?: string;
  latencyMs?: number;
  attempts?: number;
  confirmationId?: string;
}

export interface ExecutionGraph {
  readonly id: string;
  readonly nodes: ExecutionGraphNode[];
  readonly createdAt: Date;
}

export interface MergedClarification {
  readonly question: string;
  readonly missing: readonly string[];
  readonly suggestedReplies?: readonly string[];
  readonly byCapability: Readonly<Record<string, ClarificationResult>>;
}

export interface MergedConfirmation {
  readonly summary: string;
  readonly risk: 'low' | 'medium' | 'high';
  readonly items: readonly ConfirmationDraft[];
  readonly toolNames: readonly string[];
  readonly confirmationIds: Readonly<Record<string, string>>;
}

export interface OrchestrationConflict {
  readonly code: string;
  readonly message: string;
  readonly capabilityIds: readonly string[];
}

export interface OrchestrationDiagnostics {
  readonly planningMs: number;
  readonly executionMs: number;
  readonly capabilitiesUsed: readonly string[];
  readonly clarifications: number;
  readonly confirmations: number;
  readonly retries: number;
  readonly failures: number;
  readonly parallelGroups: number;
  readonly success: boolean;
  readonly partial: boolean;
  readonly graphId: string;
}

export interface CrossOrchestrationInput {
  readonly message: string;
  readonly context: CapabilityRuntimeContext;
  readonly tools: CapabilityToolPort;
  readonly priorSlotsByCapability?: Readonly<Record<string, SlotBag>>;
  readonly confirmationApproved?: boolean;
  readonly approvedToolConfirmations?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export type CrossOrchestrationResult =
  | {
      readonly kind: 'clarify';
      readonly text: string;
      readonly graph: ExecutionGraph;
      readonly clarification: MergedClarification;
      readonly slotsByCapability: Readonly<Record<string, SlotBag>>;
      readonly diagnostics: OrchestrationDiagnostics;
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'confirmation_required';
      readonly text: string;
      readonly graph: ExecutionGraph;
      readonly confirmation: MergedConfirmation;
      readonly slotsByCapability: Readonly<Record<string, SlotBag>>;
      readonly diagnostics: OrchestrationDiagnostics;
    }
  | {
      readonly kind: 'completed' | 'partial';
      readonly text: string;
      readonly graph: ExecutionGraph;
      readonly slotsByCapability: Readonly<Record<string, SlotBag>>;
      readonly diagnostics: OrchestrationDiagnostics;
      readonly conflicts?: readonly OrchestrationConflict[];
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'unsupported';
      readonly text: string;
      readonly graph: ExecutionGraph;
      readonly slotsByCapability: Readonly<Record<string, SlotBag>>;
      readonly diagnostics: OrchestrationDiagnostics;
    };

export type OrchestrationProgressEvent =
  | { readonly type: 'planning'; readonly segmentCount: number }
  | { readonly type: 'node_started'; readonly nodeId: string; readonly capabilityId: string }
  | {
      readonly type: 'node_completed';
      readonly nodeId: string;
      readonly capabilityId: string;
      readonly status: GraphNodeStatus;
    }
  | { readonly type: 'clarification'; readonly question: string }
  | { readonly type: 'confirmation'; readonly summary: string };
