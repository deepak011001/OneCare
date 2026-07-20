import type { IntentSegment } from './types';

const SEGMENT_SPLIT =
  /\n+|\?(?=\s|$)|(?:^|\s+)(?:and|also|plus|then)\s+(?=(?:how|what|where|who|can|do|does|show|am|is|are|i\s+have|tell)\b)/i;

/**
 * Split a natural-language message into capability-sized intent segments.
 * Does not encode domain rules — selection happens later via Capability Registry.
 */
export function splitIntentSegments(message: string): IntentSegment[] {
  const cleaned = message.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const byQuestion = cleaned
    .split(/\?(?=\s|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => (/[?.!]$/.test(p) ? p : `${p}?`));

  if (byQuestion.length > 1) {
    return byQuestion
      .filter((q) => q.replace(/[?]/g, '').trim().length > 2)
      .map((text, order) => ({ id: `seg-${order + 1}`, text, order }));
  }

  const andParts = cleaned
    .split(SEGMENT_SPLIT)
    .map((p) => p.trim())
    .filter((p) => p.length > 6);

  if (andParts.length > 1) {
    return andParts.map((text, order) => ({
      id: `seg-${order + 1}`,
      text: /[?.!]$/.test(text) ? text : text,
      order,
    }));
  }

  // "I have N questions" stil treated as one segment if not splitable;
  // follow-up context covers nested asks.
  return [{ id: 'seg-1', text: cleaned, order: 0 }];
}
