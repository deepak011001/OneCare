import { resolveRelativeDatePhrase } from '../dates';
import type { EntityDeclaration, EntityKind, SlotBag } from '../types';

export type EntityExtractor = (message: string, prior: SlotBag, now: Date) => unknown | undefined;

const extractors = new Map<EntityKind, EntityExtractor>();

export function registerEntityExtractor(kind: EntityKind, extractor: EntityExtractor): void {
  extractors.set(kind, extractor);
}

export function getEntityExtractor(kind: EntityKind): EntityExtractor | undefined {
  return extractors.get(kind);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

registerEntityExtractor('relativeDate', (message, _prior, now) => {
  return resolveRelativeDatePhrase(message, now) ?? undefined;
});

registerEntityExtractor('dateRange', (message, _prior, now) => {
  return resolveRelativeDatePhrase(message, now) ?? undefined;
});

registerEntityExtractor('date', (message, _prior, now) => {
  const range = resolveRelativeDatePhrase(message, now);
  return range?.startDate;
});

registerEntityExtractor('reason', (message) => {
  const match = message.match(/\b(?:reason|because|for)\s*[:-]?\s*(.+)$/i);
  if (!match?.[1]) return undefined;
  const reason = match[1].trim();
  if (
    /^(tomorrow|today|next|casual|sick|annual)\b/i.test(reason) &&
    reason.split(/\s+/).length < 3
  ) {
    return undefined;
  }
  return reason.slice(0, 1000);
});

registerEntityExtractor('halfDay', (message) => {
  if (/\bhalf[\s-]?day\b/i.test(message)) return true;
  if (/\bfull[\s-]?day\b/i.test(message)) return false;
  return undefined;
});

registerEntityExtractor('requestId', (message) => {
  const match = message.match(/\b(?:request\s*)?(?:id|#)?\s*([a-z]+-[a-z0-9-]+)\b/i);
  return match?.[1];
});

registerEntityExtractor('leaveType', (message) => {
  const aliases: Record<string, string> = {
    casual: 'Casual',
    causal: 'Casual',
    sick: 'Sick',
    annual: 'Annual',
    earned: 'Annual',
    privilege: 'Privilege',
    unpaid: 'Unpaid',
    maternity: 'Maternity',
    paternity: 'Paternity',
  };
  const lower = message.toLowerCase();
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) return canonical;
  }
  const explicit = message.match(/\b(?:leave type|type)\s*[:=]?\s*([A-Za-z]+)/i);
  if (explicit?.[1]) {
    const key = explicit[1].toLowerCase();
    return aliases[key] ?? capitalize(explicit[1]);
  }
  return undefined;
});

registerEntityExtractor('amount', (message) => {
  const match = message.match(/\b(?:₹|rs\.?|inr|usd|\$)?\s*(\d+(?:\.\d+)?)\b/i);
  return match?.[1] ? Number(match[1]) : undefined;
});

registerEntityExtractor('ticket', (message) => {
  const match = message.match(/\b(?:ticket|inc|req)[#\s-]*([A-Za-z0-9-]+)\b/i);
  return match?.[1];
});

registerEntityExtractor('text', (message) => message.trim() || undefined);

/**
 * Extract slots from declared entities. Capabilities may merge domain-specific overrides.
 */
export function extractDeclaredEntities(
  declarations: readonly EntityDeclaration[],
  message: string,
  prior: SlotBag = {},
  now: Date = new Date(),
): SlotBag {
  const next: Record<string, unknown> = { ...prior };

  for (const declaration of declarations) {
    const extractor = extractors.get(declaration.kind);
    if (!extractor) continue;
    const value = extractor(message, prior, now);
    if (value === undefined) continue;

    if (declaration.kind === 'relativeDate' || declaration.kind === 'dateRange') {
      const range = value as { startDate: string; endDate: string };
      if (declaration.slotKey === 'dateRange' || declaration.slotKey === '*') {
        next.startDate = range.startDate;
        next.endDate = range.endDate;
      } else {
        next[declaration.slotKey] = range;
      }
      continue;
    }

    next[declaration.slotKey] = value;
  }

  return next;
}

export function mergeSlotBags(prior: SlotBag, extracted: SlotBag): SlotBag {
  return { ...prior, ...extracted };
}

export function missingRequiredSlots(
  declarations: readonly EntityDeclaration[],
  intent: string,
  slots: SlotBag,
): string[] {
  const missing: string[] = [];
  for (const declaration of declarations) {
    const required =
      declaration.requiredForIntents?.includes(intent) ||
      declaration.requiredForIntents?.includes('*');
    if (!required) continue;
    const value = slots[declaration.slotKey];
    if (value === undefined || value === null || value === '') {
      missing.push(declaration.slotKey);
    }
  }
  // dateRange convenience: require startDate/endDate when declaration uses dateRange
  for (const declaration of declarations) {
    if (declaration.kind !== 'dateRange' && declaration.kind !== 'relativeDate') continue;
    const required =
      declaration.requiredForIntents?.includes(intent) ||
      declaration.requiredForIntents?.includes('*');
    if (!required) continue;
    if (!slots.startDate) missing.push('startDate');
    if (!slots.endDate) missing.push('endDate');
  }
  return [...new Set(missing)];
}
