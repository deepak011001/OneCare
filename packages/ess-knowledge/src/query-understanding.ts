/**
 * Query understanding for ESS Knowledge — map N phrasings to retrieval-friendly text
 * without inventing policy answers. Used before KnowledgeRetrievalPort.search.
 */

const FILLER =
  /\b(please|kindly|could you|can you|would you|i (?:want(?:ed)?|need|would like) to (?:know|ask|understand)|tell me|explain(?: to me)?|help me (?:with|understand)|i(?:'m| am) (?:curious|confused) about)\b/gi;

/** Synonym / paraphrase expansions — improve recall across casual employee language. */
const EXPANSIONS: readonly { readonly pattern: RegExp; readonly terms: readonly string[] }[] = [
  {
    pattern: /\b(pto|paid time off|time off|vacation days?|annual leave|earned leave|el\b)\b/i,
    terms: ['leave', 'annual leave', 'leave policy', 'leave balance'],
  },
  {
    pattern: /\b(how many leaves?|leaves? (?:do i|i) have|leave balance|remaining leave)\b/i,
    terms: ['leave', 'leave policy', 'entitlement', 'annual'],
  },
  {
    pattern: /\b(carry[\s-]?forward|encash|unused leave)\b/i,
    terms: ['carry forward', 'leave policy', 'annual leave'],
  },
  {
    pattern: /\b(work from home|wfh|remote work|hybrid|work remotely|from home)\b/i,
    terms: ['work from home', 'wfh', 'hybrid', 'attendance'],
  },
  {
    pattern: /\b(maternity|paternity|parental|baby leave|newborn|adoption leave)\b/i,
    terms: ['maternity', 'paternity', 'parental leave'],
  },
  {
    pattern: /\b(resign|resignation|quit|notice period|last working day|leaving the company)\b/i,
    terms: ['resignation', 'exit', 'notice period'],
  },
  {
    pattern: /\b(reimburs(?:e|ement)?|claim (?:expense|money)|get money back|expense claim)\b/i,
    terms: ['reimbursement', 'expense', 'claim'],
  },
  {
    pattern: /\b(travel|trip|business travel|flight|hotel)\b.*\b(approv|claim|policy|reimburs)/i,
    terms: ['travel', 'reimbursement', 'expense'],
  },
  {
    pattern: /\b(who approves?|approval|manager approve)\b/i,
    terms: ['approval', 'manager', 'leave policy'],
  },
  {
    pattern: /\b(probation|probationary|confirmation period)\b/i,
    terms: ['probation', 'employment'],
  },
  {
    pattern: /\b(insurance|medical cover|health cover|mediclaim|hospital)\b/i,
    terms: ['insurance', 'health insurance', 'benefits'],
  },
  {
    pattern: /\b(internet allowance|broadband|wifi allowance)\b/i,
    terms: ['internet allowance', 'benefits'],
  },
  {
    pattern: /\b(relocati(?:on|ng)|moving allowance|transfer)\b/i,
    terms: ['relocation', 'benefits'],
  },
  {
    pattern: /\b(attendance|regulariz|missed punch|clock[\s-]?in|late arrival)\b/i,
    terms: ['attendance', 'regularization', 'clock in'],
  },
  {
    pattern: /\b(code of conduct|ethics|harassment|workplace behaviour|behavior)\b/i,
    terms: ['code of conduct', 'handbook'],
  },
  {
    pattern: /\b(vpn|remote access|connect (?:to )?(?:office|network))\b/i,
    terms: ['vpn', 'remote access'],
  },
  {
    pattern: /\b(password|forgot password|reset (?:my )?password|mfa|otp)\b/i,
    terms: ['password reset', 'mfa'],
  },
  {
    pattern: /\b(salary|payroll|payslip|pay day|when (?:do i|will i) get paid)\b/i,
    terms: ['payroll', 'salary'],
  },
  {
    pattern: /\b(onboarding|first day|joining day|new joiner)\b/i,
    terms: ['joining', 'onboarding'],
  },
  {
    pattern: /\b(referral|refer a (?:friend|candidate))\b/i,
    terms: ['referral', 'recruitment'],
  },
  {
    pattern: /\b(training|learning|certification|lms)\b/i,
    terms: ['training', 'learning', 'certification'],
  },
];

export interface UnderstoodKnowledgeQuery {
  /** Original employee question */
  readonly original: string;
  /** Cleaned question for display / slots */
  readonly normalized: string;
  /** Text string optimized for retrieval (includes synonym expansions) */
  readonly retrievalText: string;
  /** Expanded topic hints for scoring */
  readonly expandedTerms: readonly string[];
}

/**
 * Normalize casual employee phrasing and expand synonyms for retrieval.
 * Does not change architecture — pure pre-retrieval understanding.
 */
export function understandKnowledgeQuery(message: string): UnderstoodKnowledgeQuery {
  const original = message.trim();
  const normalized = original
    .replace(FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, '');

  const expanded = new Set<string>();
  for (const rule of EXPANSIONS) {
    if (rule.pattern.test(original) || rule.pattern.test(normalized)) {
      for (const term of rule.terms) expanded.add(term);
    }
  }

  const base = normalized.length >= 3 ? normalized : original;
  const expansionSuffix = [...expanded].join(' ');
  const retrievalText = expansionSuffix
    ? `${base} ${expansionSuffix}`.replace(/\s+/g, ' ').trim()
    : base;

  return {
    original,
    normalized: base,
    retrievalText,
    expandedTerms: [...expanded],
  };
}
