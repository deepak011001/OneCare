import type {
  CapabilityExecuteInput,
  CapabilityExecuteResult,
  CapabilityHandleInput,
  CapabilityHelp,
  CapabilityResponse,
  CapabilityTelemetryDescriptor,
  CapabilityTurnInput,
  ClarificationResult,
  ConfirmationDraft,
  DashboardWidgetDef,
  EntityDeclaration,
  ExecutionPlan,
  SlotBag,
  SuggestedPromptDef,
  ValidationResult,
} from './types';

/**
 * Contract every Employee Agent capability must implement.
 * Side effects go through Tool Registry / MCP via {@link CapabilityExecuteInput.tools}.
 */
export interface EmployeeCapability {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedIntents: readonly string[];
  readonly supportedEntities: readonly EntityDeclaration[];
  readonly supportedTools: readonly string[];
  readonly requiredPermissions: readonly string[];
  /** Higher runs first when multiple capabilities canHandle the same turn. */
  readonly priority: number;
  readonly enabled: boolean;

  canHandle(input: CapabilityHandleInput): boolean;
  extractEntities(input: CapabilityTurnInput): SlotBag;
  validate(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ValidationResult;
  clarify(input: {
    readonly intent: string;
    readonly missing: readonly string[];
    readonly slots: SlotBag;
  }): ClarificationResult;
  buildExecutionPlan(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ExecutionPlan | null;
  buildConfirmation(input: {
    readonly plan: ExecutionPlan;
    readonly slots: SlotBag;
    readonly extras?: Readonly<Record<string, unknown>>;
  }): ConfirmationDraft | null;
  execute(input: CapabilityExecuteInput): Promise<CapabilityExecuteResult>;
  formatResponse(input: {
    readonly intent?: string;
    readonly toolName?: string;
    readonly toolResult?: unknown;
    readonly message?: string;
    readonly suggestedReplies?: readonly string[];
  }): CapabilityResponse;
  dashboardWidgets(): readonly DashboardWidgetDef[];
  suggestedPrompts(): readonly SuggestedPromptDef[];
  helpExamples(): CapabilityHelp;
  telemetry(): CapabilityTelemetryDescriptor;

  /** Domain-specific missing-slot resolution (framework falls back to entity declarations). */
  missingSlots?(intent: string, slots: SlotBag): readonly string[];
  /** Resolve primary intent for this turn when planner intent is absent. */
  detectIntent?(message: string, priorSlots?: SlotBag): string | undefined;
}
