import { randomUUID } from 'node:crypto';
import {
  createCapabilityRunner,
  type CapabilityRegistry,
  type CapabilityToolPort,
  type ClarificationResult,
  type ConfirmationDraft,
  type EmployeeCapability,
  type ExecutionPlan,
  type SlotBag,
} from '@onecare/ess-capability';
import { selectCapabilities } from './capability-selector';
import { buildExecutionGraph, classifyNodeKind, priorityForKind } from './graph-builder';
import { splitIntentSegments } from './intent-splitter';
import { mergeClarifications, mergeConfirmations } from './mergers';
import { detectConflicts, mergeResponses } from './response';
import {
  createOrchestrationDiagnostics,
  type OrchestrationTelemetrySink,
  type ProgressEmitter,
} from './telemetry';
import type {
  CrossOrchestrationInput,
  CrossOrchestrationResult,
  ExecutionGraph,
  ExecutionGraphNode,
  GraphNodeKind,
} from './types';

export interface CrossCapabilityOrchestratorOptions {
  readonly registry: CapabilityRegistry;
  readonly telemetry?: OrchestrationTelemetrySink;
  readonly onProgress?: ProgressEmitter;
  readonly defaultTimeoutMs?: number;
  readonly maxRetries?: number;
}

/**
 * Cross-capability orchestrator — Employee Agent coordination layer.
 * Uses Capability Registry + CapabilityRunner + Tool port only.
 * Not coupled to Leave / Attendance / Knowledge packages.
 */
export class CrossCapabilityOrchestrator {
  private readonly runner = createCapabilityRunner();
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly options: CrossCapabilityOrchestratorOptions) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 12_000;
    this.maxRetries = options.maxRetries ?? 1;
  }

  async run(input: CrossOrchestrationInput): Promise<CrossOrchestrationResult> {
    const planningStarted = Date.now();
    const segments = splitIntentSegments(input.message);
    this.options.onProgress?.({ type: 'planning', segmentCount: segments.length });

    const selections = selectCapabilities({
      registry: this.options.registry,
      segments,
      ...(input.priorSlotsByCapability
        ? { priorSlotsByCapability: input.priorSlotsByCapability }
        : {}),
    });

    const clarifications: Record<string, ClarificationResult> = {};
    const confirmations: ConfirmationDraft[] = [];
    const invalidMessages: Record<string, string> = {};
    const slotsByCapability: Record<string, SlotBag> = {
      ...(input.priorSlotsByCapability ?? {}),
    };
    const planMeta = new Map<
      string,
      {
        plan?: ExecutionPlan;
        kind: GraphNodeKind;
        priority: number;
        requiresConfirmation: boolean;
      }
    >();

    const knownSelections = selections.filter((s) => s.capabilityId !== 'unknown');
    if (knownSelections.length === 0) {
      const graph = buildExecutionGraph({ selections, plans: planMeta });
      return {
        kind: 'unsupported',
        text: 'I am not sure which employee service can help with that. Try leave, attendance, or a policy question.',
        graph,
        slotsByCapability,
        diagnostics: createOrchestrationDiagnostics({
          graphId: graph.id,
          planningMs: Date.now() - planningStarted,
          executionMs: 0,
          capabilitiesUsed: [],
          clarifications: 0,
          confirmations: 0,
          retries: 0,
          failures: 0,
          parallelGroups: 0,
          success: false,
          partial: false,
        }),
      };
    }

    for (const selection of knownSelections) {
      const capability = this.options.registry.get(selection.capabilityId);
      if (!capability) continue;

      const prior = input.priorSlotsByCapability?.[capability.id] ?? {};
      const lifecycle = this.runner.run(capability, {
        message: selection.segmentText,
        ...(selection.intent ? { intent: selection.intent } : {}),
        priorSlots: prior,
        context: input.context,
      });

      if (lifecycle.kind === 'clarify') {
        clarifications[capability.id] = {
          question: lifecycle.question,
          missing: lifecycle.missing,
          slots: lifecycle.slots,
          ...(lifecycle.suggestedReplies ? { suggestedReplies: lifecycle.suggestedReplies } : {}),
        };
        slotsByCapability[capability.id] = lifecycle.slots;
        planMeta.set(selection.segmentId, {
          kind: 'clarify',
          priority: priorityForKind('clarify', capability.priority),
          requiresConfirmation: false,
        });
        continue;
      }

      if (lifecycle.kind === 'invalid') {
        slotsByCapability[capability.id] = lifecycle.slots;
        invalidMessages[selection.segmentId] = lifecycle.message;
        planMeta.set(selection.segmentId, {
          kind: 'read',
          priority: capability.priority,
          requiresConfirmation: false,
        });
        continue;
      }

      if (lifecycle.kind === 'unsupported') {
        planMeta.set(selection.segmentId, {
          kind: 'unknown',
          priority: 0,
          requiresConfirmation: false,
        });
        continue;
      }

      // ready
      slotsByCapability[capability.id] = lifecycle.plan.slots;
      const kind = classifyNodeKind(lifecycle.plan, capability.id);
      planMeta.set(selection.segmentId, {
        plan: lifecycle.plan,
        kind,
        priority: priorityForKind(kind, capability.priority),
        requiresConfirmation: lifecycle.plan.requiresConfirmation,
      });
      if (lifecycle.confirmation) {
        confirmations.push(lifecycle.confirmation);
      }
    }

    const planningMs = Date.now() - planningStarted;
    let graph = buildExecutionGraph({ selections: knownSelections, plans: planMeta });

    // Surface validation failures as completed informational nodes
    for (const node of graph.nodes) {
      const invalid = invalidMessages[node.segmentId];
      if (invalid) {
        node.status = 'completed';
        node.resultText = invalid;
      }
    }

    const mergedClarify = mergeClarifications(clarifications);
    if (mergedClarify) {
      this.options.onProgress?.({ type: 'clarification', question: mergedClarify.question });
      for (const node of graph.nodes) {
        const clarification = clarifications[node.capabilityId];
        if (clarification) {
          node.status = 'waiting_clarification';
          node.clarification = clarification;
        }
      }
      return {
        kind: 'clarify',
        text: mergedClarify.question,
        graph,
        clarification: mergedClarify,
        slotsByCapability,
        diagnostics: createOrchestrationDiagnostics({
          graphId: graph.id,
          planningMs,
          executionMs: 0,
          capabilitiesUsed: knownSelections.map((s) => s.capabilityId),
          clarifications: Object.keys(clarifications).length,
          confirmations: 0,
          retries: 0,
          failures: 0,
          parallelGroups: 0,
          success: false,
          partial: false,
        }),
        ...(mergedClarify.suggestedReplies
          ? { suggestedReplies: mergedClarify.suggestedReplies }
          : {}),
      };
    }

    const approval =
      input.confirmationApproved === true ||
      Object.keys(input.approvedToolConfirmations ?? {}).length > 0;

    const execStarted = Date.now();
    let retries = 0;

    // Phase 1: execute non-write nodes (reads / knowledge) so multi-intent can return
    // partial answers even when writes need confirmation.
    const readOnlyGraph: ExecutionGraph = {
      ...graph,
      nodes: graph.nodes.filter((n) => n.kind !== 'write'),
    };
    if (readOnlyGraph.nodes.length > 0) {
      const executedReads = await this.executeGraph(readOnlyGraph, input, () => {
        retries += 1;
      });
      const byId = new Map(executedReads.nodes.map((n) => [n.id, n]));
      graph = {
        ...graph,
        nodes: graph.nodes.map((n) => byId.get(n.id) ?? n),
      };
    }

    const writeNodes = graph.nodes.filter((n) => n.kind === 'write' && n.plan);
    if (writeNodes.length > 0 && !approval) {
      // Mint confirmations via tool execute (policy/confirmation store)
      const drafts: ConfirmationDraft[] = [];
      const confirmationIds: Record<string, string> = {};
      for (const node of writeNodes) {
        await this.executeNode(
          node,
          input,
          new Map(),
          input.timeoutMs ?? this.defaultTimeoutMs,
          0,
          () => {
            retries += 1;
          },
        );
        if (node.status === 'waiting_confirmation') {
          const capability = this.options.registry.get(node.capabilityId);
          const confirmation =
            node.confirmation ??
            (node.plan && capability
              ? capability.buildConfirmation({ plan: node.plan, slots: node.plan.slots })
              : null);
          if (confirmation) {
            node.confirmation = confirmation;
            drafts.push({
              ...confirmation,
              summary: node.errorMessage ?? confirmation.summary,
            });
            if (node.confirmationId) {
              confirmationIds[confirmation.toolName] = node.confirmationId;
            }
          }
        }
      }

      const merged = mergeConfirmations(drafts, confirmationIds);
      if (merged) {
        this.options.onProgress?.({ type: 'confirmation', summary: merged.summary });
        const readText = mergeResponses(graph.nodes.filter((n) => n.kind !== 'write'));
        const text = [readText, merged.summary].filter(Boolean).join('\n\n');
        return {
          kind: 'confirmation_required',
          text,
          graph,
          confirmation: merged,
          slotsByCapability,
          diagnostics: createOrchestrationDiagnostics({
            graphId: graph.id,
            planningMs,
            executionMs: Date.now() - execStarted,
            capabilitiesUsed: knownSelections.map((s) => s.capabilityId),
            clarifications: 0,
            confirmations: merged.items.length,
            retries,
            failures: graph.nodes.filter((n) => n.status === 'failed').length,
            parallelGroups: countParallelGroups(graph),
            success: false,
            partial: graph.nodes.some((n) => n.status === 'completed'),
          }),
        };
      }
      // Writes completed without a confirmation gate — fall through to merge.
    }

    if (writeNodes.length > 0 && approval) {
      const writeGraph: ExecutionGraph = {
        ...graph,
        nodes: writeNodes.map((n) => ({ ...n, status: 'pending' as const })),
      };
      const executedWrites = await this.executeGraph(writeGraph, input, () => {
        retries += 1;
      });
      const byId = new Map(executedWrites.nodes.map((n) => [n.id, n]));
      graph = {
        ...graph,
        nodes: graph.nodes.map((n) => byId.get(n.id) ?? n),
      };
    }

    // If there were only reads, executeGraph already ran them.
    // If there were no writes and somehow reads weren't run (empty), ensure completion.
    if (writeNodes.length === 0 && graph.nodes.every((n) => n.status === 'pending')) {
      graph = await this.executeGraph(graph, input, () => {
        retries += 1;
      });
    }

    const executionMs = Date.now() - execStarted;

    const conflicts = detectConflicts(graph.nodes);
    const text = mergeResponses(graph.nodes);
    const failures = graph.nodes.filter(
      (n) => n.status === 'failed' || n.status === 'timed_out',
    ).length;
    const completed = graph.nodes.filter((n) => n.status === 'completed').length;
    const partial = failures > 0 && completed > 0;
    const success = failures === 0 && completed > 0;

    const suggested = graph.nodes
      .flatMap((n) => {
        const capability = this.options.registry.get(n.capabilityId);
        return capability?.suggestedPrompts().filter((p) => p.kind === 'follow_up') ?? [];
      })
      .map((p) => p.prompt)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 4);

    this.options.telemetry?.record({
      type: 'orchestration.completed',
      payload: {
        graphId: graph.id,
        capabilities: knownSelections.map((s) => s.capabilityId),
        planningMs,
        executionMs,
        failures,
        partial,
      },
    });

    return {
      kind: partial ? 'partial' : success ? 'completed' : 'unsupported',
      text,
      graph,
      slotsByCapability,
      diagnostics: createOrchestrationDiagnostics({
        graphId: graph.id,
        planningMs,
        executionMs,
        capabilitiesUsed: knownSelections.map((s) => s.capabilityId),
        clarifications: 0,
        confirmations: confirmations.length,
        retries,
        failures,
        parallelGroups: countParallelGroups(graph),
        success,
        partial,
      }),
      ...(conflicts.length ? { conflicts } : {}),
      ...(suggested.length ? { suggestedReplies: suggested } : {}),
    };
  }

  private async executeGraph(
    graph: ExecutionGraph,
    input: CrossOrchestrationInput,
    onRetry: () => void,
  ): Promise<ExecutionGraph> {
    const readCache = new Map<string, unknown>();
    const pending = new Set(graph.nodes.map((n) => n.id));
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;
    const maxRetries = input.maxRetries ?? this.maxRetries;

    while (pending.size > 0) {
      if (input.signal?.aborted) {
        for (const node of graph.nodes) {
          if (pending.has(node.id)) node.status = 'cancelled';
        }
        break;
      }

      const ready = graph.nodes.filter(
        (n) =>
          pending.has(n.id) &&
          n.dependsOn.every((dep) => {
            const parent = graph.nodes.find((p) => p.id === dep);
            return parent?.status === 'completed' || parent?.status === 'skipped';
          }),
      );

      if (ready.length === 0) {
        for (const id of pending) {
          const node = graph.nodes.find((n) => n.id === id);
          if (node) {
            node.status = 'failed';
            node.errorMessage = 'Dependency cycle or unmet dependency.';
          }
        }
        break;
      }

      const parallel = ready.filter((n) => n.mode === 'parallel' || n.kind !== 'write');
      const sequential = ready.filter((n) => !parallel.includes(n));

      await Promise.all(
        parallel.map((node) =>
          this.executeNode(node, input, readCache, timeoutMs, maxRetries, onRetry),
        ),
      );
      for (const node of parallel) pending.delete(node.id);

      for (const node of sequential) {
        await this.executeNode(node, input, readCache, timeoutMs, maxRetries, onRetry);
        pending.delete(node.id);
      }
    }

    return graph;
  }

  private async executeNode(
    node: ExecutionGraphNode,
    input: CrossOrchestrationInput,
    readCache: Map<string, unknown>,
    timeoutMs: number,
    maxRetries: number,
    onRetry: () => void,
  ): Promise<void> {
    const capability = this.options.registry.get(node.capabilityId);
    const plan = node.plan;
    if (!capability || !plan) {
      if (!plan) {
        node.status = 'skipped';
        return;
      }
      node.status = 'failed';
      node.errorMessage = 'Capability not registered.';
      return;
    }

    this.options.onProgress?.({
      type: 'node_started',
      nodeId: node.id,
      capabilityId: node.capabilityId,
    });

    const cacheKey = `${plan.toolName}:${JSON.stringify(plan.arguments)}`;
    if (!node.requiresConfirmation && readCache.has(cacheKey)) {
      const cached = readCache.get(cacheKey);
      node.status = 'completed';
      node.resultText = formatCapabilityResult(capability, plan, cached);
      node.latencyMs = 0;
      this.options.onProgress?.({
        type: 'node_completed',
        nodeId: node.id,
        capabilityId: node.capabilityId,
        status: node.status,
      });
      return;
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt += 1;
      node.attempts = attempt;
      if (attempt > 1) {
        node.status = 'retrying';
        onRetry();
      } else {
        node.status = 'running';
      }

      const started = Date.now();
      try {
        const result = await withTimeout(
          capability.execute({
            plan,
            context: input.context,
            confirmationApproved:
              input.confirmationApproved === true ||
              Boolean(input.approvedToolConfirmations?.[plan.toolName]),
            tools: input.tools,
          }),
          timeoutMs,
          input.signal,
        );

        node.latencyMs = Date.now() - started;

        if (result.kind === 'confirmation_required') {
          node.status = 'waiting_confirmation';
          node.errorMessage = result.summary;
          if (result.confirmationId) {
            node.confirmationId = result.confirmationId;
          }
          return;
        }
        if (result.kind === 'failed') {
          if (attempt <= maxRetries) continue;
          node.status = 'failed';
          node.errorMessage = result.message;
          return;
        }
        if (result.kind === 'delegated') {
          node.plan = result.plan;
          continue;
        }

        node.status = 'completed';
        node.resultText = formatCapabilityResult(capability, plan, result.data);
        if (!node.requiresConfirmation) {
          readCache.set(cacheKey, result.data);
        }
        this.options.onProgress?.({
          type: 'node_completed',
          nodeId: node.id,
          capabilityId: node.capabilityId,
          status: node.status,
        });
        return;
      } catch (error) {
        node.latencyMs = Date.now() - started;
        const message = error instanceof Error ? error.message : 'Capability execution failed.';
        if (message === 'TIMEOUT') {
          node.status = 'timed_out';
          node.errorMessage = 'Timed out.';
          if (attempt <= maxRetries) continue;
          return;
        }
        if (attempt <= maxRetries) continue;
        node.status = 'failed';
        node.errorMessage = message;
        return;
      }
    }
  }
}

export function createCrossCapabilityOrchestrator(
  options: CrossCapabilityOrchestratorOptions,
): CrossCapabilityOrchestrator {
  return new CrossCapabilityOrchestrator(options);
}

/** Adapter from Tool Registry / MCP executor into CapabilityToolPort. */
export function createCapabilityToolPort(input: {
  readonly getTool: (name: string) => { implemented: boolean; connectorId?: string } | undefined;
  readonly execute: (req: {
    toolName: string;
    connectorId?: string;
    arguments: Readonly<Record<string, unknown>>;
    context: {
      tenantId: unknown;
      userId: unknown;
      correlationId: unknown;
      roles: readonly string[];
      permissions: readonly string[];
      attributes?: Readonly<Record<string, unknown>>;
    };
    confirmationApproved: boolean;
  }) => Promise<{
    ok: boolean;
    data?: unknown;
    errorMessage?: string;
    decision?: string;
    confirmationId?: string;
  }>;
}): CapabilityToolPort {
  return {
    getTool: (toolName) => input.getTool(toolName),
    execute: async (request) => {
      const tool = input.getTool(request.toolName);
      const result = await input.execute({
        toolName: request.toolName,
        ...(tool?.connectorId ? { connectorId: tool.connectorId } : {}),
        arguments: request.arguments,
        context: {
          tenantId: request.context.tenantId,
          userId: request.context.userId,
          correlationId: request.context.correlationId,
          roles: request.context.roles,
          permissions: request.context.permissions,
          ...(request.context.attributes ? { attributes: request.context.attributes } : {}),
        },
        confirmationApproved: request.confirmationApproved,
      });
      return {
        ok: result.ok,
        ...(result.data !== undefined ? { data: result.data } : {}),
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
        ...(result.decision ? { decision: result.decision } : {}),
        ...(result.confirmationId ? { confirmationId: result.confirmationId } : {}),
      };
    },
  };
}

function formatCapabilityResult(
  capability: EmployeeCapability,
  plan: ExecutionPlan,
  data: unknown,
): string {
  return capability.formatResponse({
    intent: plan.intent,
    toolName: plan.toolName,
    toolResult: data,
  }).text;
}

function countParallelGroups(graph: ExecutionGraph): number {
  return graph.nodes.filter((n) => n.mode === 'parallel').length > 1 ? 1 : 0;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('CANCELLED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    promise
      .then((value) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      });
  });
}

export function newOrchestrationId(): string {
  return randomUUID();
}
