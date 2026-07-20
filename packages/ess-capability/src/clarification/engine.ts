import type { EntityDeclaration, SlotBag } from '../types';
import { missingRequiredSlots } from '../entities/extractors';

export interface ClarificationRequest {
  readonly intent: string;
  readonly slots: SlotBag;
  readonly declarations: readonly EntityDeclaration[];
  /** Capability-specific missing slots (overrides declaration-based detection when provided). */
  readonly missing?: readonly string[];
}

export interface ClarificationAnswer {
  readonly question: string;
  readonly missing: readonly string[];
  readonly suggestedReplies?: readonly string[];
  readonly slots: SlotBag;
}

/**
 * Framework asks clarifying questions from entity declarations.
 * Capabilities only declare requirements.
 */
export class ClarificationEngine {
  resolveMissing(request: ClarificationRequest): readonly string[] {
    if (request.missing) return request.missing;
    return missingRequiredSlots(request.declarations, request.intent, request.slots);
  }

  ask(request: ClarificationRequest): ClarificationAnswer | null {
    const missing = this.resolveMissing(request);
    if (missing.length === 0) return null;
    const first = missing[0]!;
    const declaration = request.declarations.find(
      (d) => d.slotKey === first || (first === 'startDate' && d.kind === 'relativeDate'),
    );
    const question =
      declaration?.clarifyQuestion ??
      (first === 'startDate' || first === 'endDate'
        ? 'Which date should I use?'
        : `Could you provide ${first}?`);
    const suggestedReplies = declaration?.suggestedReplies;
    return {
      question,
      missing,
      slots: request.slots,
      ...(suggestedReplies ? { suggestedReplies } : {}),
    };
  }
}

export function createClarificationEngine(): ClarificationEngine {
  return new ClarificationEngine();
}
