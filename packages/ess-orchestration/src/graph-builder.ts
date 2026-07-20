import type { ExecutionPlan } from '@onecare/ess-capability';
import type {
  CapabilitySelection,
  ExecutionGraph,
  ExecutionGraphNode,
  ExecutionMode,
  GraphNodeKind,
} from './types';

/** Priority bands — higher runs earlier when sequencing writes vs reads. */
export const PRIORITY = {
  emergency: 1000,
  security: 900,
  write: 700,
  urgent: 600,
  read: 400,
  knowledge: 300,
  unknown: 100,
} as const;

export function classifyNodeKind(
  plan: ExecutionPlan | null | undefined,
  capabilityId: string,
): GraphNodeKind {
  if (!plan) return capabilityId === 'unknown' ? 'unknown' : 'read';
  if (plan.requiresConfirmation) return 'write';
  // Knowledge-style tools use dotted names (capability-agnostic convention)
  if (plan.toolName.includes('.')) return 'knowledge';
  return 'read';
}

export function priorityForKind(kind: GraphNodeKind, capabilityPriority: number): number {
  const band =
    kind === 'write'
      ? PRIORITY.write
      : kind === 'knowledge'
        ? PRIORITY.knowledge
        : kind === 'unknown'
          ? PRIORITY.unknown
          : PRIORITY.read;
  return band + capabilityPriority;
}

export function inferMode(kind: GraphNodeKind, dependsOn: readonly string[]): ExecutionMode {
  if (dependsOn.length > 0) return 'dependent';
  if (kind === 'write') return 'sequential';
  return 'parallel';
}

/**
 * Detect soft dependencies: writes benefit from preceding reads in the same capability.
 */
export function detectDependencies(
  nodes: readonly Omit<ExecutionGraphNode, 'status'>[],
): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  const byCapability = new Map<string, Array<Omit<ExecutionGraphNode, 'status'>>>();

  for (const node of nodes) {
    const list = byCapability.get(node.capabilityId) ?? [];
    list.push(node);
    byCapability.set(node.capabilityId, list);
  }

  for (const [, group] of byCapability) {
    const reads = group.filter((n) => n.kind === 'read' || n.kind === 'knowledge');
    const writes = group.filter((n) => n.kind === 'write');
    for (const write of writes) {
      const readIds = reads.map((r) => r.id);
      if (readIds.length) deps.set(write.id, readIds);
    }
  }

  // Soft cross-capability dependency: writes wait on knowledge reads in the same turn
  // when segment text shares topical tokens (no hard-coded capability ids).
  const knowledgeNodes = nodes.filter((n) => n.kind === 'knowledge');
  const writes = nodes.filter((n) => n.kind === 'write');
  for (const write of writes) {
    const tokens = tokenize(write.segmentText);
    if (tokens.length === 0) continue;
    const related = knowledgeNodes
      .filter((k) => tokens.some((t) => tokenize(k.segmentText).includes(t)))
      .map((k) => k.id);
    if (related.length) {
      deps.set(write.id, [...new Set([...(deps.get(write.id) ?? []), ...related])]);
    }
  }

  return deps;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

export function buildExecutionGraph(input: {
  readonly selections: readonly CapabilitySelection[];
  readonly plans: ReadonlyMap<
    string,
    {
      plan?: ExecutionPlan;
      kind: GraphNodeKind;
      priority: number;
      requiresConfirmation: boolean;
    }
  >;
}): ExecutionGraph {
  const baseNodes: Omit<ExecutionGraphNode, 'status' | 'dependsOn' | 'mode'>[] =
    input.selections.map((selection, index) => {
      const planned = input.plans.get(selection.segmentId);
      const kind = planned?.kind ?? classifyNodeKind(undefined, selection.capabilityId);
      return {
        id: `node-${index + 1}`,
        capabilityId: selection.capabilityId,
        capabilityName: selection.capabilityName,
        segmentId: selection.segmentId,
        segmentText: selection.segmentText,
        ...(selection.intent ? { intent: selection.intent } : {}),
        kind,
        priority: planned?.priority ?? priorityForKind(kind, 0),
        requiresConfirmation: planned?.requiresConfirmation ?? false,
        ...(planned?.plan ? { plan: planned.plan } : {}),
      };
    });

  const deps = detectDependencies(
    baseNodes.map((n) => ({
      ...n,
      dependsOn: [] as string[],
      mode: 'parallel' as const,
    })),
  );

  const nodes: ExecutionGraphNode[] = baseNodes.map((node) => {
    const dependsOn = [...new Set(deps.get(node.id) ?? [])];
    return {
      ...node,
      dependsOn,
      mode: inferMode(node.kind, dependsOn),
      status: 'pending',
    };
  });

  // Sort: higher priority first within parallel-ready sets
  nodes.sort((a, b) => b.priority - a.priority);

  return {
    id: `graph-${Date.now()}`,
    nodes,
    createdAt: new Date(),
  };
}
