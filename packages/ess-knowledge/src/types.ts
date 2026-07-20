/** Knowledge domain types — retrieval-engine agnostic. */

export type KnowledgeDomain =
  'hr' | 'it' | 'finance' | 'company' | 'learning' | 'recruitment' | 'general';

export type KnowledgeCategory =
  | 'leave'
  | 'attendance'
  | 'payroll'
  | 'benefits'
  | 'insurance'
  | 'employment'
  | 'joining'
  | 'exit'
  | 'assets'
  | 'software'
  | 'vpn'
  | 'outlook'
  | 'password'
  | 'expense'
  | 'reimbursement'
  | 'salary'
  | 'tax'
  | 'policies'
  | 'sop'
  | 'compliance'
  | 'handbook'
  | 'training'
  | 'certification'
  | 'referral'
  | 'internal_jobs'
  | 'greetings'
  | 'help'
  | 'small_talk'
  | 'unknown';

export type KnowledgeIntent =
  | 'employee.knowledge.ask'
  | 'employee.knowledge.search'
  | 'employee.knowledge.related'
  | 'employee.knowledge.popular'
  | 'employee.knowledge.help'
  | 'employee.knowledge.categories';

export type AnswerFormat =
  'answer' | 'summary' | 'bullets' | 'table' | 'timeline' | 'comparison' | 'steps';

export interface KnowledgeClassification {
  readonly domain: KnowledgeDomain;
  readonly category: KnowledgeCategory;
  readonly topic?: string;
  readonly confidence: number;
}

export interface KnowledgeSlots {
  readonly policyName?: string;
  readonly department?: string;
  readonly location?: string;
  readonly benefit?: string;
  readonly leaveType?: string;
  readonly role?: string;
  readonly country?: string;
  readonly office?: string;
  readonly document?: string;
  readonly manager?: string;
  readonly keyword?: string;
  readonly query?: string;
  readonly domain?: KnowledgeDomain;
  readonly category?: KnowledgeCategory;
  readonly topic?: string;
  /** Prior answer document ids for follow-up context. */
  readonly lastDocumentIds?: readonly string[];
  readonly lastTopic?: string;
  readonly lastDomain?: KnowledgeDomain;
  readonly lastCategory?: KnowledgeCategory;
}

export interface KnowledgeRequest {
  readonly id: string;
  readonly text: string;
  readonly intent: KnowledgeIntent;
  readonly classification: KnowledgeClassification;
  readonly slots: KnowledgeSlots;
}

export interface KnowledgeSourceAttribution {
  readonly documentId: string;
  readonly title: string;
  readonly section?: string;
  readonly lastUpdated?: string;
  readonly documentType: string;
  readonly confidence: number;
  readonly url?: string;
}

export interface KnowledgeAnswerPart {
  readonly requestId: string;
  readonly format: AnswerFormat;
  readonly title?: string;
  readonly text: string;
  readonly bullets?: readonly string[];
  readonly steps?: readonly string[];
  readonly table?: {
    readonly columns: readonly string[];
    readonly rows: readonly (readonly string[])[];
  };
  readonly sources: readonly KnowledgeSourceAttribution[];
  readonly relatedTopics?: readonly string[];
  readonly relatedDocumentIds?: readonly string[];
  readonly suggestedFollowUps?: readonly string[];
  readonly confidence: number;
  readonly found: boolean;
}

export interface KnowledgeAnswer {
  readonly text: string;
  readonly parts: readonly KnowledgeAnswerPart[];
  readonly sources: readonly KnowledgeSourceAttribution[];
  readonly relatedPolicies?: readonly string[];
  readonly relatedDocuments?: readonly { readonly id: string; readonly title: string }[];
  readonly faqs?: readonly string[];
  readonly suggestedFollowUps?: readonly string[];
  readonly confidence: number;
  readonly multiIntent: boolean;
}

export interface KnowledgeCapabilityInput {
  readonly message: string;
  readonly priorSlots?: KnowledgeSlots;
  readonly now?: Date;
  readonly permissions?: readonly string[];
}

export type KnowledgeCapabilityOutcome =
  | {
      readonly kind: 'clarify';
      readonly intent: KnowledgeIntent;
      readonly question: string;
      readonly missing: readonly string[];
      readonly slots: KnowledgeSlots;
      readonly suggestedReplies?: readonly string[];
      readonly requests: readonly KnowledgeRequest[];
    }
  | {
      readonly kind: 'invalid';
      readonly intent: KnowledgeIntent;
      readonly message: string;
      readonly slots: KnowledgeSlots;
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'unsupported';
      readonly message: string;
    }
  | {
      readonly kind: 'answered';
      readonly intent: KnowledgeIntent;
      readonly answer: KnowledgeAnswer;
      readonly slots: KnowledgeSlots;
      readonly requests: readonly KnowledgeRequest[];
    };

export interface PopularQuestion {
  readonly id: string;
  readonly question: string;
  readonly domain: KnowledgeDomain;
  readonly category: KnowledgeCategory;
  readonly views: number;
  readonly trending?: boolean;
  readonly recentlyUpdated?: boolean;
}

export interface KnowledgeCategorySummary {
  readonly domain: KnowledgeDomain;
  readonly category: KnowledgeCategory;
  readonly label: string;
  readonly exampleQuestions: readonly string[];
}
