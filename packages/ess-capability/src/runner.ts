import type { EmployeeCapability } from './capability';
import { createClarificationEngine } from './clarification';
import type { CapabilityLifecycleOutcome, CapabilityTurnInput } from './types';
import type { CapabilityTelemetryEvent, CapabilityTelemetrySink } from './telemetry';

export interface CapabilityRunnerOptions {
  readonly telemetry?: CapabilityTelemetrySink;
}

/**
 * Shared lifecycle: canHandle → extract → clarify → validate → plan → confirm draft.
 * Tool execution remains with the orchestrator / Tool Registry via capability.execute().
 */
export class CapabilityRunner {
  private readonly clarifier = createClarificationEngine();

  constructor(private readonly options: CapabilityRunnerOptions = {}) {}

  run(capability: EmployeeCapability, input: CapabilityTurnInput): CapabilityLifecycleOutcome {
    const started = Date.now();
    const handleInput = {
      message: input.message,
      ...(input.intent ? { intent: input.intent } : {}),
      ...(input.priorSlots ? { priorSlots: input.priorSlots } : {}),
    };
    if (!capability.canHandle(handleInput)) {
      return {
        kind: 'unsupported',
        capabilityId: capability.id,
        message: `${capability.name} cannot handle this request.`,
      };
    }

    const intent =
      input.intent ??
      capability.detectIntent?.(input.message, input.priorSlots) ??
      capability.supportedIntents[0];
    if (!intent) {
      return {
        kind: 'unsupported',
        capabilityId: capability.id,
        message: 'Could not determine intent.',
      };
    }

    const slots = capability.extractEntities({ ...input, intent });
    const missing =
      capability.missingSlots?.(intent, slots) ??
      this.clarifier.resolveMissing({
        intent,
        slots,
        declarations: capability.supportedEntities,
      });

    if (missing.length > 0) {
      const clarification = capability.clarify({ intent, missing, slots });
      this.emit({
        type: 'capability.clarification',
        capabilityId: capability.id,
        intent,
        missing: clarification.missing,
      });
      this.emit({
        type: 'capability.handled',
        capabilityId: capability.id,
        intent,
        latencyMs: Date.now() - started,
        outcome: 'clarify',
      });
      return {
        kind: 'clarify',
        capabilityId: capability.id,
        intent,
        question: clarification.question,
        missing: clarification.missing,
        slots: clarification.slots,
        ...(clarification.suggestedReplies
          ? { suggestedReplies: clarification.suggestedReplies }
          : {}),
      };
    }

    const validation = capability.validate({ ...input, slots, intent });
    const errors = validation.issues.filter((i) => (i.severity ?? 'error') === 'error');
    if (!validation.ok || errors.length > 0) {
      this.emit({
        type: 'capability.validation_failed',
        capabilityId: capability.id,
        intent,
        codes: errors.map((e) => e.code),
      });
      this.emit({
        type: 'capability.handled',
        capabilityId: capability.id,
        intent,
        latencyMs: Date.now() - started,
        outcome: 'invalid',
      });
      return {
        kind: 'invalid',
        capabilityId: capability.id,
        intent,
        message: errors.map((e) => e.message).join(' ') || 'Validation failed.',
        issues: errors,
        slots,
      };
    }

    const plan = capability.buildExecutionPlan({ ...input, slots, intent });
    if (!plan) {
      return {
        kind: 'unsupported',
        capabilityId: capability.id,
        message: 'Unable to build an execution plan.',
      };
    }

    const confirmation = plan.requiresConfirmation
      ? (capability.buildConfirmation({
          plan,
          slots,
          ...(input.extras ? { extras: input.extras } : {}),
        }) ?? undefined)
      : undefined;

    if (confirmation) {
      this.emit({
        type: 'capability.confirmation',
        capabilityId: capability.id,
        toolName: plan.toolName,
      });
    }

    this.emit({
      type: 'capability.handled',
      capabilityId: capability.id,
      intent,
      latencyMs: Date.now() - started,
      outcome: 'ready',
    });

    return {
      kind: 'ready',
      capabilityId: capability.id,
      plan,
      ...(confirmation ? { confirmation } : {}),
    };
  }

  private emit(event: CapabilityTelemetryEvent): void {
    this.options.telemetry?.record(event);
  }
}

export function createCapabilityRunner(options?: CapabilityRunnerOptions): CapabilityRunner {
  return new CapabilityRunner(options);
}
