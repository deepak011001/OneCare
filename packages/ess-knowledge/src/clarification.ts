import type { KnowledgeIntent, KnowledgeRequest, KnowledgeSlots } from './types';

export function needsKnowledgeClarification(input: {
  readonly intent: KnowledgeIntent;
  readonly requests: readonly KnowledgeRequest[];
  readonly slots: KnowledgeSlots;
  readonly message: string;
}): { missing: string[]; question: string; suggestedReplies?: string[] } | null {
  const { intent, requests, slots, message } = input;
  if (intent === 'employee.knowledge.help' || intent === 'employee.knowledge.popular') {
    return null;
  }

  const lower = message.toLowerCase().trim();

  // Extremely vague: "leave policy" alone without country when multi-country signal
  if (
    /^(leave policy|the leave policy|policy)$/i.test(lower) &&
    !slots.country &&
    !slots.location
  ) {
    return {
      missing: ['country'],
      question: 'Which country’s leave policy should I look up?',
      suggestedReplies: ['India', 'US', 'UK'],
    };
  }

  if (/^(what benefits|benefits|my benefits)\??$/i.test(lower) && !slots.benefit) {
    return {
      missing: ['benefit'],
      question: 'Which benefits are you interested in — health, travel, insurance, or learning?',
      suggestedReplies: ['Health', 'Travel', 'Insurance', 'Learning'],
    };
  }

  // Empty / greeting-only without prior context
  if (
    requests.length === 1 &&
    (requests[0]?.classification.confidence ?? 1) < 0.25 &&
    !slots.lastTopic &&
    lower.length < 12
  ) {
    return {
      missing: ['query'],
      question:
        'What would you like to know? You can ask about policies, benefits, IT, or finance.',
      suggestedReplies: [
        'What is our leave policy?',
        'Can I work from home?',
        'How does reimbursement work?',
      ],
    };
  }

  return null;
}
