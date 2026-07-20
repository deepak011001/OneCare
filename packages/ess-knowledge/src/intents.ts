import { KNOWLEDGE_TAXONOMY } from './taxonomy';
import type {
  KnowledgeCategory,
  KnowledgeClassification,
  KnowledgeDomain,
  KnowledgeIntent,
  KnowledgeRequest,
  KnowledgeSlots,
} from './types';

const FOLLOW_UP_HINT = /\b(what about|and for|how about|same for|also|similar(?:ly)?|instead)\b/i;

const HELP_HINT =
  /\b(what can you (help|answer)|knowledge (help|topics)|supported topics|search tips|what topics)\b/i;

const POPULAR_HINT = /\b(popular|trending|most viewed|frequently asked|common questions)\b/i;

const CATEGORIES_HINT = /\b(knowledge categories|what topics|list categories|browse policies)\b/i;

const RELATED_HINT = /\b(related (policies|documents|topics)|similar questions)\b/i;

const KNOWLEDGE_SIGNAL =
  /\b(policy|handbook|sop|code of conduct|work from home|wfh|maternity|paternity|reimburs(?:e|ement)|allowance|probation|relocati|benefits?|insurance|vpn|password|referral|training|certification|how does|how do i|where (can|do|is)|what (is|are|happens)|can i claim|do we have)\b/i;

export function isKnowledgeRelatedMessage(message: string): boolean {
  return (
    KNOWLEDGE_SIGNAL.test(message) ||
    HELP_HINT.test(message) ||
    POPULAR_HINT.test(message) ||
    CATEGORIES_HINT.test(message) ||
    RELATED_HINT.test(message)
  );
}

export function detectKnowledgeIntent(
  message: string,
  prior?: KnowledgeSlots,
): KnowledgeIntent | undefined {
  if (HELP_HINT.test(message)) return 'employee.knowledge.help';
  if (POPULAR_HINT.test(message)) return 'employee.knowledge.popular';
  if (CATEGORIES_HINT.test(message)) return 'employee.knowledge.categories';
  if (RELATED_HINT.test(message)) return 'employee.knowledge.related';
  if (FOLLOW_UP_HINT.test(message) && (prior?.lastTopic || prior?.lastDocumentIds?.length)) {
    return 'employee.knowledge.ask';
  }
  if (isKnowledgeRelatedMessage(message)) return 'employee.knowledge.ask';
  if (prior?.lastTopic || prior?.query) return 'employee.knowledge.ask';
  return undefined;
}

export function classifyKnowledgeText(
  text: string,
  prior?: KnowledgeSlots,
): KnowledgeClassification {
  const lower = text.toLowerCase();

  if (FOLLOW_UP_HINT.test(text) && prior?.lastDomain && prior.lastCategory) {
    return {
      domain: prior.lastDomain,
      category: prior.lastCategory,
      ...(prior.lastTopic ? { topic: prior.lastTopic } : {}),
      confidence: 0.75,
    };
  }

  let best: { node: (typeof KNOWLEDGE_TAXONOMY)[number]; score: number } | null = null;
  for (const node of KNOWLEDGE_TAXONOMY) {
    let score = 0;
    for (const keyword of node.keywords) {
      if (lower.includes(keyword.toLowerCase())) score += keyword.split(/\s+/).length + 2;
    }
    if (prior?.domain === node.domain) score += 1;
    if (prior?.category === node.category) score += 2;
    if (!best || score > best.score) best = { node, score };
  }

  if (!best || best.score === 0) {
    if (prior?.lastDomain && prior.lastCategory) {
      return {
        domain: prior.lastDomain,
        category: prior.lastCategory,
        ...(prior.lastTopic ? { topic: prior.lastTopic } : {}),
        confidence: 0.4,
      };
    }
    return { domain: 'general', category: 'help', confidence: 0.2 };
  }

  const topic = extractTopic(lower, best.node.category);
  return {
    domain: best.node.domain,
    category: best.node.category,
    ...(topic ? { topic } : {}),
    confidence: Math.min(0.95, 0.35 + best.score * 0.08),
  };
}

function extractTopic(lower: string, category: KnowledgeCategory): string | undefined {
  const topics: Record<string, RegExp> = {
    maternity: /\bmaternity\b/,
    paternity: /\bpaternity\b/,
    'carry forward': /\bcarry[\s-]?forward\b/,
    reimbursement: /\breimburs/,
    'internet allowance': /\binternet\b/,
    relocation: /\brelocati/,
    probation: /\bprobation\b/,
    'code of conduct': /\bcode of conduct\b/,
    wfh: /\b(work from home|wfh|hybrid)\b/,
    appeal: /\brejected\b|\bappeal\b|\bescalat/,
  };
  for (const [topic, pattern] of Object.entries(topics)) {
    if (pattern.test(lower)) return topic;
  }
  return category === 'unknown' ? undefined : category;
}

/**
 * Split a user message into multiple knowledge questions when present.
 */
export function splitKnowledgeQuestions(message: string): string[] {
  const cleaned = message.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Prefer explicit multi-question separators
  const byMark = cleaned
    .split(/\?(?=\s|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => (p.endsWith('?') ? p : `${p}?`));

  if (byMark.length > 1) {
    return byMark.filter((q) => q.replace('?', '').trim().length > 2);
  }

  const andParts = cleaned
    .split(/\b(?:\band\b|,)\s+(?=(?:what|who|where|how|can|do|does|is|are)\b)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 8);

  if (andParts.length > 1) {
    return andParts.map((p) => (/[?.!]$/.test(p) ? p : `${p}?`));
  }

  return [cleaned];
}

export function buildKnowledgeRequests(
  message: string,
  prior?: KnowledgeSlots,
  intentOverride?: KnowledgeIntent,
): KnowledgeRequest[] {
  const intent =
    intentOverride ?? detectKnowledgeIntent(message, prior) ?? 'employee.knowledge.ask';

  if (
    intent === 'employee.knowledge.help' ||
    intent === 'employee.knowledge.popular' ||
    intent === 'employee.knowledge.categories'
  ) {
    return [
      {
        id: 'req-1',
        text: message,
        intent,
        classification: classifyKnowledgeText(message, prior),
        slots: { ...prior, query: message },
      },
    ];
  }

  const parts = splitKnowledgeQuestions(message);
  return parts.map((text, index) => {
    const classification = classifyKnowledgeText(text, prior);
    return {
      id: `req-${index + 1}`,
      text,
      intent: intent === 'employee.knowledge.related' ? intent : 'employee.knowledge.ask',
      classification,
      slots: {
        ...prior,
        query: text,
        domain: classification.domain,
        category: classification.category,
        ...(classification.topic ? { topic: classification.topic } : {}),
      },
    };
  });
}

export function domainLabel(domain: KnowledgeDomain): string {
  const labels: Record<KnowledgeDomain, string> = {
    hr: 'HR',
    it: 'IT',
    finance: 'Finance',
    company: 'Company',
    learning: 'Learning',
    recruitment: 'Recruitment',
    general: 'General',
  };
  return labels[domain];
}
