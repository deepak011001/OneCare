import type { ExecutionGraphNode, OrchestrationConflict } from './types';

/**
 * Surface conflicts between node outcomes without inventing domain rules in the platform core.
 * Heuristics stay result-text based so new capabilities plug in without orchestrator changes.
 */
export function detectConflicts(nodes: readonly ExecutionGraphNode[]): OrchestrationConflict[] {
  const conflicts: OrchestrationConflict[] = [];
  const completed = nodes.filter((n) => n.status === 'completed' && n.resultText);

  // Text-heuristic conflicts only — no capability package imports.
  const write = completed.find((n) => n.kind === 'write');
  const holidayMention = completed.find((n) =>
    /holiday/i.test(`${n.resultText ?? ''} ${n.segmentText}`),
  );
  if (write && holidayMention && /leave|time\s*off|pto/i.test(write.segmentText + (write.intent ?? ''))) {
    conflicts.push({
      code: 'WRITE_HOLIDAY_OVERLAP',
      message:
        'Your request may overlap a holiday. Please review dates before confirming.',
      capabilityIds: [write.capabilityId, holidayMention.capabilityId],
    });
  }

  const alreadyDone = completed.find((n) =>
    /already\s+(checked|clocked|applied|submitted)/i.test(n.resultText ?? ''),
  );
  if (alreadyDone) {
    conflicts.push({
      code: 'ALREADY_COMPLETED',
      message: 'This action appears to conflict with the current status.',
      capabilityIds: [alreadyDone.capabilityId],
    });
  }

  const failed = nodes.filter((n) => n.status === 'failed' || n.status === 'timed_out');
  const ok = nodes.filter((n) => n.status === 'completed');
  if (failed.length && ok.length) {
    conflicts.push({
      code: 'PARTIAL_FAILURE',
      message: `Some steps could not complete: ${failed.map((f) => f.capabilityName).join(', ')}.`,
      capabilityIds: failed.map((f) => f.capabilityId),
    });
  }

  return conflicts;
}

export function mergeResponses(nodes: readonly ExecutionGraphNode[]): string {
  const parts: string[] = [];

  for (const node of nodes) {
    if (node.status === 'completed' && node.resultText) {
      parts.push(node.resultText.trim());
      continue;
    }
    if (node.status === 'failed' || node.status === 'timed_out') {
      parts.push(
        `${node.capabilityName} is temporarily unavailable${
          node.errorMessage ? ` (${node.errorMessage})` : ''
        }.`,
      );
    }
    if (node.status === 'cancelled') {
      parts.push(`${node.capabilityName} step was cancelled.`);
    }
  }

  if (parts.length === 0) {
    return 'I could not complete that request.';
  }

  if (parts.length === 1) return parts[0]!;

  return parts.join('\n\n');
}
