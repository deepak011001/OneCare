import type { PopularQuestion } from './types';

/** Stub popular / trending questions — bookmarks reserved for later. */
export const POPULAR_QUESTIONS: readonly PopularQuestion[] = [
  {
    id: 'pq-leave-policy',
    question: 'What is our leave policy?',
    domain: 'hr',
    category: 'leave',
    views: 1280,
    trending: true,
  },
  {
    id: 'pq-wfh',
    question: 'Can I work from home?',
    domain: 'hr',
    category: 'attendance',
    views: 980,
    trending: true,
  },
  {
    id: 'pq-maternity',
    question: 'How many maternity leaves do I get?',
    domain: 'hr',
    category: 'leave',
    views: 640,
    recentlyUpdated: true,
  },
  {
    id: 'pq-reimburse',
    question: 'How does reimbursement work?',
    domain: 'finance',
    category: 'reimbursement',
    views: 720,
  },
  {
    id: 'pq-internet',
    question: 'Can I claim internet allowance?',
    domain: 'hr',
    category: 'benefits',
    views: 410,
  },
  {
    id: 'pq-conduct',
    question: 'Where can I find the code of conduct?',
    domain: 'company',
    category: 'compliance',
    views: 390,
    recentlyUpdated: true,
  },
  {
    id: 'pq-probation',
    question: 'What happens during probation?',
    domain: 'hr',
    category: 'employment',
    views: 355,
  },
  {
    id: 'pq-relocation',
    question: 'Do we have relocation support?',
    domain: 'hr',
    category: 'benefits',
    views: 280,
  },
];

export function listTrendingQuestions(limit = 5): readonly PopularQuestion[] {
  return POPULAR_QUESTIONS.filter((q) => q.trending)
    .concat(POPULAR_QUESTIONS)
    .filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i)
    .slice(0, limit);
}

export function listMostViewed(limit = 5): readonly PopularQuestion[] {
  return [...POPULAR_QUESTIONS].sort((a, b) => b.views - a.views).slice(0, limit);
}

export function listRecentlyUpdatedQuestions(limit = 5): readonly PopularQuestion[] {
  return POPULAR_QUESTIONS.filter((q) => q.recentlyUpdated).slice(0, limit);
}
