import type { KnowledgeCategory, KnowledgeDomain } from './types';

export interface TaxonomyNode {
  readonly domain: KnowledgeDomain;
  readonly category: KnowledgeCategory;
  readonly label: string;
  readonly keywords: readonly string[];
  readonly examples: readonly string[];
}

/**
 * Hierarchical knowledge taxonomy — domains plug in without hundreds of intents.
 */
export const KNOWLEDGE_TAXONOMY: readonly TaxonomyNode[] = [
  {
    domain: 'hr',
    category: 'leave',
    label: 'Leave',
    keywords: [
      'leave policy',
      'maternity',
      'paternity',
      'carry forward',
      'casual leave',
      'sick leave',
      'annual leave',
      'who approves',
      'pto',
      'paid time off',
      'vacation',
      'time off',
      'earned leave',
      'leave entitlement',
    ],
    examples: [
      'What is our leave policy?',
      'How many maternity leaves do I get?',
      'Do we get PTO?',
      'Can I carry forward unused leave?',
    ],
  },
  {
    domain: 'hr',
    category: 'attendance',
    label: 'Attendance',
    keywords: [
      'attendance policy',
      'work from home',
      'wfh',
      'hybrid',
      'remote work',
      'work remotely',
      'from home',
      'regularization',
      'missed punch',
    ],
    examples: ['Can I work from home?', 'Am I allowed to work remotely twice a week?'],
  },
  {
    domain: 'hr',
    category: 'benefits',
    label: 'Benefits',
    keywords: ['benefits', 'internet allowance', 'relocation', 'allowance'],
    examples: ['Can I claim internet allowance?', 'Do we have relocation support?'],
  },
  {
    domain: 'hr',
    category: 'insurance',
    label: 'Insurance',
    keywords: ['insurance', 'medical cover', 'health insurance'],
    examples: ['What health insurance do we have?'],
  },
  {
    domain: 'hr',
    category: 'employment',
    label: 'Employment',
    keywords: ['probation', 'notice period', 'employment'],
    examples: ['What happens during probation?'],
  },
  {
    domain: 'hr',
    category: 'joining',
    label: 'Joining',
    keywords: ['joining', 'onboarding', 'first day'],
    examples: ['What do I need on joining day?'],
  },
  {
    domain: 'hr',
    category: 'exit',
    label: 'Exit',
    keywords: ['resignation', 'exit', 'last working day', 'quit', 'notice period', 'leaving company'],
    examples: ['How does resignation work?', 'What happens if I resign?', 'What is the notice period?'],
  },
  {
    domain: 'hr',
    category: 'payroll',
    label: 'Payroll',
    keywords: ['payroll calendar', 'salary credit'],
    examples: ['When is salary credited?'],
  },
  {
    domain: 'it',
    category: 'vpn',
    label: 'VPN',
    keywords: ['vpn', 'remote access'],
    examples: ['How do I connect to VPN?'],
  },
  {
    domain: 'it',
    category: 'password',
    label: 'Password',
    keywords: ['password reset', 'forgot password', 'mfa'],
    examples: ['How do I reset my password?'],
  },
  {
    domain: 'it',
    category: 'outlook',
    label: 'Outlook',
    keywords: ['outlook', 'email setup'],
    examples: ['How do I set up Outlook?'],
  },
  {
    domain: 'it',
    category: 'assets',
    label: 'Assets',
    keywords: ['laptop', 'asset request', 'hardware'],
    examples: ['How do I request a laptop?'],
  },
  {
    domain: 'it',
    category: 'software',
    label: 'Software',
    keywords: ['software install', 'license request'],
    examples: ['How do I request software?'],
  },
  {
    domain: 'finance',
    category: 'reimbursement',
    label: 'Reimbursement',
    keywords: ['reimbursement', 'reimburse', 'claim expense'],
    examples: ['I forgot how reimbursement works.'],
  },
  {
    domain: 'finance',
    category: 'expense',
    label: 'Expense',
    keywords: ['expense policy', 'expense claim'],
    examples: ['What is the expense policy?'],
  },
  {
    domain: 'finance',
    category: 'salary',
    label: 'Salary',
    keywords: ['salary structure', 'payslip policy'],
    examples: ['Where is salary structure documented?'],
  },
  {
    domain: 'finance',
    category: 'tax',
    label: 'Tax',
    keywords: ['tax declaration', 'form 16', 'investment proof'],
    examples: ['How do tax declarations work?'],
  },
  {
    domain: 'company',
    category: 'policies',
    label: 'Policies',
    keywords: ['company policy', 'policy'],
    examples: ['Where can I find company policies?'],
  },
  {
    domain: 'company',
    category: 'handbook',
    label: 'Handbook',
    keywords: ['handbook', 'employee handbook'],
    examples: ['Where is the employee handbook?'],
  },
  {
    domain: 'company',
    category: 'compliance',
    label: 'Compliance',
    keywords: ['code of conduct', 'compliance', 'ethics'],
    examples: ['Where can I find the code of conduct?'],
  },
  {
    domain: 'company',
    category: 'sop',
    label: 'SOP',
    keywords: ['sop', 'standard operating'],
    examples: ['Where are SOPs published?'],
  },
  {
    domain: 'learning',
    category: 'training',
    label: 'Training',
    keywords: ['training', 'lms', 'course catalog'],
    examples: ['What training is available?'],
  },
  {
    domain: 'learning',
    category: 'certification',
    label: 'Certification',
    keywords: ['certification', 'cert reimbursement'],
    examples: ['Do we reimburse certifications?'],
  },
  {
    domain: 'recruitment',
    category: 'referral',
    label: 'Referral',
    keywords: ['referral', 'refer a friend'],
    examples: ['How does employee referral work?'],
  },
  {
    domain: 'recruitment',
    category: 'internal_jobs',
    label: 'Internal Jobs',
    keywords: ['internal job', 'internal transfer', 'job posting'],
    examples: ['How do internal job applications work?'],
  },
  {
    domain: 'general',
    category: 'help',
    label: 'Help',
    keywords: ['help', 'what can you answer', 'knowledge help'],
    examples: ['What knowledge topics can you help with?'],
  },
  {
    domain: 'general',
    category: 'greetings',
    label: 'Greetings',
    keywords: ['hello', 'hi there', 'good morning'],
    examples: ['Hello'],
  },
  {
    domain: 'general',
    category: 'small_talk',
    label: 'Small Talk',
    keywords: ['how are you', 'thanks'],
    examples: ['Thanks'],
  },
];

export function listCategoriesByDomain(domain: KnowledgeDomain): readonly TaxonomyNode[] {
  return KNOWLEDGE_TAXONOMY.filter((n) => n.domain === domain);
}

export function findTaxonomyNode(
  domain?: KnowledgeDomain,
  category?: KnowledgeCategory,
): TaxonomyNode | undefined {
  if (!domain || !category) return undefined;
  return KNOWLEDGE_TAXONOMY.find((n) => n.domain === domain && n.category === category);
}
