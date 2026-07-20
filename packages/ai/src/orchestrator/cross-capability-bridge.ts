import type { CapabilityRegistry, SlotBag } from '@onecare/ess-capability';
import {
  createCapabilityToolPort,
  createCrossCapabilityOrchestrator,
  type CrossOrchestrationResult,
  type OrchestrationDiagnostics,
  type OrchestrationProgressEvent,
} from '@onecare/ess-orchestration';
import type { ToolExecutorPort, ToolRegistryPort } from '@onecare/tools';
import type { RequestContext } from '@onecare/shared';
import type { StreamEvent } from '../streaming/types';

export const ESS_SLOTS_MEMORY_KEY = 'ess.slotsByCapability';

export interface CrossCapabilityBridgeDeps {
  readonly registry: CapabilityRegistry;
  readonly tools: ToolRegistryPort;
  readonly toolExecutor?: ToolExecutorPort;
  readonly resolveConfirmationApproved?: (
    tenantId: string,
    userId: string,
    confirmationId: string,
  ) => Promise<boolean>;
}

export function shouldUseCrossCapability(input: {
  readonly registry: CapabilityRegistry;
  readonly message: string;
  readonly agentId?: string;
  readonly intent?: string;
  readonly hasApprovedConfirmations: boolean;
  readonly hasPriorSlots: boolean;
  readonly planIntents: readonly string[];
}): boolean {
  if (input.hasApprovedConfirmations || input.hasPriorSlots) return true;
  if (input.agentId === 'employee' || input.agentId === 'knowledge') return true;
  if (input.intent?.startsWith('employee.')) return true;
  if (input.planIntents.some((i) => i.startsWith('employee.'))) return true;
  return input.registry
    .list()
    .some((capability) => capability.canHandle({ message: input.message }));
}

export async function runCrossCapabilityTurn(input: {
  readonly deps: CrossCapabilityBridgeDeps;
  readonly message: string;
  readonly context: RequestContext;
  readonly priorSlotsByCapability: Readonly<Record<string, SlotBag>>;
  readonly approvedToolConfirmations?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly onEvent: (event: StreamEvent) => void;
  readonly onProgress?: (event: OrchestrationProgressEvent) => void;
}): Promise<CrossOrchestrationResult> {
  const orchestrator = createCrossCapabilityOrchestrator({
    registry: input.deps.registry,
    onProgress: (event) => {
      input.onProgress?.(event);
      emitProgress(input.onEvent, event);
    },
  });

  const tools = createCapabilityToolPort({
    getTool: (name) => {
      const tool = input.deps.tools.get(name);
      if (!tool) return undefined;
      return {
        implemented: tool.implemented,
        ...(tool.connectorId ? { connectorId: tool.connectorId } : {}),
      };
    },
    execute: async (req) => {
      if (!input.deps.toolExecutor) {
        return { ok: false, errorMessage: 'Enterprise tools are not available yet.' };
      }
      const tool = input.deps.tools.get(req.toolName);
      let confirmationApproved = req.confirmationApproved;
      const confirmationId = input.approvedToolConfirmations?.[req.toolName];
      if (confirmationId && input.deps.resolveConfirmationApproved) {
        confirmationApproved = await input.deps.resolveConfirmationApproved(
          String(req.context.tenantId),
          String(req.context.userId),
          confirmationId,
        );
      }
      const result = await input.deps.toolExecutor.execute({
        toolName: req.toolName,
        connectorId: req.connectorId ?? tool?.connectorId ?? 'none',
        arguments: req.arguments,
        context: {
          tenantId: input.context.tenantId,
          userId: input.context.userId,
          correlationId: input.context.correlationId,
          roles: input.context.roles,
          permissions: input.context.permissions,
          attributes: {
            ...input.context.attributes,
            ...(req.context.attributes ?? {}),
          },
        },
        confirmationApproved,
      });
      return {
        ok: result.ok,
        ...(result.data !== undefined ? { data: result.data } : {}),
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
        ...(result.decision ? { decision: result.decision } : {}),
        ...(result.confirmationId ? { confirmationId: result.confirmationId } : {}),
      };
    },
  });

  const result = await orchestrator.run({
    message: input.message,
    context: {
      tenantId: String(input.context.tenantId),
      userId: String(input.context.userId),
      correlationId: String(input.context.correlationId),
      roles: input.context.roles,
      permissions: input.context.permissions,
      ...(input.context.attributes ? { attributes: input.context.attributes } : {}),
    },
    tools,
    priorSlotsByCapability: input.priorSlotsByCapability,
    ...(input.approvedToolConfirmations
      ? { approvedToolConfirmations: input.approvedToolConfirmations }
      : {}),
    ...(input.signal ? { signal: input.signal } : {}),
  });

  emitResultEvents(input.onEvent, result);
  return result;
}

export function toPublicDiagnostics(
  diagnostics: OrchestrationDiagnostics,
): OrchestrationDiagnostics {
  return diagnostics;
}

function emitProgress(
  onEvent: (event: StreamEvent) => void,
  event: OrchestrationProgressEvent,
): void {
  if (event.type === 'planning') {
    onEvent({
      type: 'orchestration_progress',
      sequence: 0,
      data: {
        phase: 'planning',
        message: 'Understanding your request…',
        segmentCount: event.segmentCount,
      },
    });
    return;
  }
  if (event.type === 'node_started') {
    onEvent({
      type: 'orchestration_progress',
      sequence: 0,
      data: {
        phase: 'running',
        message: 'Working on your request…',
      },
    });
    return;
  }
  if (event.type === 'node_completed') {
    onEvent({
      type: 'orchestration_progress',
      sequence: 0,
      data: {
        phase: 'step_done',
        message: 'Part of your request is ready…',
        status: event.status,
      },
    });
    return;
  }
  if (event.type === 'clarification') {
    onEvent({
      type: 'orchestration_progress',
      sequence: 0,
      data: { phase: 'clarification', message: 'Need a bit more detail…' },
    });
  }
  if (event.type === 'confirmation') {
    onEvent({
      type: 'orchestration_progress',
      sequence: 0,
      data: { phase: 'confirmation', message: 'Confirmation required…' },
    });
  }
}

function emitResultEvents(
  onEvent: (event: StreamEvent) => void,
  result: CrossOrchestrationResult,
): void {
  if (result.kind === 'clarify') {
    onEvent({
      type: 'clarification',
      sequence: 0,
      data: {
        question: result.clarification.question,
        missing: result.clarification.missing,
      },
    });
    if (result.suggestedReplies?.length) {
      onEvent({
        type: 'suggested_replies',
        sequence: 0,
        data: { replies: result.suggestedReplies },
      });
    }
    return;
  }

  if (result.kind === 'confirmation_required') {
    const first = result.confirmation.items[0];
    const firstId = first ? result.confirmation.confirmationIds[first.toolName] : undefined;
    onEvent({
      type: 'confirmation_required',
      sequence: 0,
      data: {
        toolName: first?.toolName ?? result.confirmation.toolNames[0],
        connectorId: '',
        ...(firstId ? { confirmationId: firstId } : {}),
        summary: result.confirmation.summary,
        arguments: first?.arguments,
        merged: result.confirmation.items.length > 1,
        toolNames: result.confirmation.toolNames,
        confirmationIds: result.confirmation.confirmationIds,
      },
    });
    for (const item of result.confirmation.items) {
      const confirmationId = result.confirmation.confirmationIds[item.toolName];
      onEvent({
        type: 'tool',
        sequence: 0,
        data: {
          name: item.toolName,
          status: 'pending_confirmation',
          ...(confirmationId ? { confirmationId } : {}),
        },
      });
    }
    return;
  }

  for (const node of result.graph.nodes) {
    if (!node.plan) continue;
    onEvent({
      type: 'tool',
      sequence: 0,
      data: {
        name: node.plan.toolName,
        status:
          node.status === 'completed'
            ? 'completed'
            : node.status === 'failed' || node.status === 'timed_out'
              ? 'failed'
              : node.status,
        ...(node.errorMessage ? { errorMessage: node.errorMessage } : {}),
        ...(node.latencyMs !== undefined ? { latencyMs: node.latencyMs } : {}),
      },
    });
  }

  if (result.kind === 'completed' || result.kind === 'partial') {
    if (result.suggestedReplies?.length) {
      onEvent({
        type: 'suggested_replies',
        sequence: 0,
        data: { replies: result.suggestedReplies },
      });
    }
    if (result.kind === 'partial') {
      onEvent({
        type: 'orchestration_progress',
        sequence: 0,
        data: {
          phase: 'partial',
          message: 'Some parts of your request could not be completed.',
        },
      });
    }
  }
}
