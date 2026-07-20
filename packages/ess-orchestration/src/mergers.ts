import type { ClarificationResult, ConfirmationDraft } from '@onecare/ess-capability';
import type { MergedClarification, MergedConfirmation } from './types';

export function mergeClarifications(
  byCapability: Readonly<Record<string, ClarificationResult>>,
): MergedClarification | null {
  const entries = Object.entries(byCapability);
  if (entries.length === 0) return null;

  if (entries.length === 1) {
    const [, c] = entries[0]!;
    return {
      question: c.question,
      missing: c.missing,
      ...(c.suggestedReplies ? { suggestedReplies: c.suggestedReplies } : {}),
      byCapability,
    };
  }

  const missing = [...new Set(entries.flatMap(([, c]) => c.missing))];
  const replies = [
    ...new Set(entries.flatMap(([, c]) => c.suggestedReplies ?? [])),
  ].slice(0, 6);

  const lines = entries.map(([, c], i) => `${i + 1}. ${c.question}`);
  return {
    question: `I need a few details before I continue:\n${lines.join('\n')}`,
    missing,
    ...(replies.length ? { suggestedReplies: replies } : {}),
    byCapability,
  };
}

export function mergeConfirmations(
  items: readonly ConfirmationDraft[],
  confirmationIds: Readonly<Record<string, string>> = {},
): MergedConfirmation | null {
  if (items.length === 0) return null;
  if (items.length === 1) {
    const item = items[0]!;
    return {
      summary: item.summary,
      risk: item.risk,
      items,
      toolNames: [item.toolName],
      confirmationIds,
    };
  }

  const riskRank = { low: 1, medium: 2, high: 3 } as const;
  const risk = items.reduce<'low' | 'medium' | 'high'>(
    (max, item) => (riskRank[item.risk] > riskRank[max] ? item.risk : max),
    'low',
  );

  const summary = [
    'Please confirm these actions:',
    ...items.map((item, i) => `${i + 1}. ${item.summary}`),
  ].join('\n');

  return {
    summary,
    risk,
    items,
    toolNames: items.map((i) => i.toolName),
    confirmationIds,
  };
}
