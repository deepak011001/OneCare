import type { CapabilityRegistry, EmployeeCapability, SlotBag } from '@onecare/ess-capability';
import type { CapabilitySelection, IntentSegment } from './types';

export interface SelectCapabilitiesInput {
  readonly registry: CapabilityRegistry;
  readonly segments: readonly IntentSegment[];
  readonly priorSlotsByCapability?: Readonly<Record<string, SlotBag>>;
  readonly agentId?: string;
}

function scoreCapability(
  capability: EmployeeCapability,
  segment: IntentSegment,
  prior?: SlotBag,
): { confidence: number; reason: string; intent?: string } {
  const intent = capability.detectIntent?.(segment.text, prior);
  const can = capability.canHandle({
    message: segment.text,
    ...(intent ? { intent } : {}),
    ...(prior ? { priorSlots: prior } : {}),
  });

  if (!can && !intent) {
    return { confidence: 0, reason: 'cannot_handle' };
  }

  let confidence = can ? 0.55 : 0.2;
  if (intent) confidence += 0.3;
  if (prior && Object.keys(prior).length > 0) confidence += 0.1;
  confidence = Math.min(0.98, confidence + capability.priority / 1000);

  return {
    confidence,
    reason: intent ? `intent:${intent}` : 'can_handle',
    ...(intent ? { intent } : {}),
  };
}

/**
 * Select the best capability per segment using the registry only — no hard-coded domains.
 */
export function selectCapabilities(input: SelectCapabilitiesInput): CapabilitySelection[] {
  const capabilities = input.registry.list();
  const selections: CapabilitySelection[] = [];

  for (const segment of input.segments) {
    const ranked: Array<{
      capability: EmployeeCapability;
      confidence: number;
      reason: string;
      intent?: string;
    }> = [];

    for (const capability of capabilities) {
      const prior = input.priorSlotsByCapability?.[capability.id];
      const scored = scoreCapability(capability, segment, prior);
      if (scored.confidence < 0.45) continue;
      ranked.push({
        capability,
        confidence: scored.confidence,
        reason: scored.reason,
        ...(scored.intent ? { intent: scored.intent } : {}),
      });
    }

    ranked.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return (
        input.registry.effectivePriority(b.capability) -
        input.registry.effectivePriority(a.capability)
      );
    });

    const best = ranked[0];
    if (!best) {
      selections.push({
        capabilityId: 'unknown',
        capabilityName: 'Unknown',
        confidence: 0,
        reason: 'no_capability',
        alternatives: [],
        segmentId: segment.id,
        segmentText: segment.text,
      });
      continue;
    }

    selections.push({
      capabilityId: best.capability.id,
      capabilityName: best.capability.name,
      ...(best.intent ? { intent: best.intent } : {}),
      confidence: best.confidence,
      reason: best.reason,
      alternatives: ranked.slice(1, 4).map((r) => r.capability.id),
      segmentId: segment.id,
      segmentText: segment.text,
    });
  }

  return selections;
}
