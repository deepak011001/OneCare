import {
  textResponse,
  type CapabilityExecuteInput,
  type CapabilityExecuteResult,
  type CapabilityHandleInput,
  type CapabilityHelp,
  type CapabilityResponse,
  type CapabilityTelemetryDescriptor,
  type CapabilityTurnInput,
  type ClarificationResult,
  type ConfirmationDraft,
  type DashboardWidgetDef,
  type EmployeeCapability,
  type ExecutionPlan,
  type SlotBag,
  type SuggestedPromptDef,
  type ValidationResult,
} from '@onecare/ess-capability';
import { formatKnowledgeAnswerMessage, buildKnowledgeAnswer } from './answer';
import { needsKnowledgeClarification } from './clarification';
import {
  asKnowledgeSlots,
  extractKnowledgeEntities,
  KNOWLEDGE_ENTITIES,
  mergeKnowledgeSlots,
  toSlotBag,
} from './entities';
import {
  buildKnowledgeRequests,
  detectKnowledgeIntent,
  domainLabel,
  isKnowledgeRelatedMessage,
} from './intents';
import {
  listMostViewed,
  listRecentlyUpdatedQuestions,
  listTrendingQuestions,
  POPULAR_QUESTIONS,
} from './popular';
import {
  createStubKnowledgeStore,
  type KnowledgeRetrievalPort,
  type KnowledgeSearchHit,
} from './retrieval';
import { KNOWLEDGE_TAXONOMY } from './taxonomy';
import type {
  KnowledgeAnswer,
  KnowledgeCapabilityInput,
  KnowledgeCapabilityOutcome,
  KnowledgeIntent,
  KnowledgeSlots,
} from './types';

export interface KnowledgeCapabilityOptions {
  readonly retrieval?: KnowledgeRetrievalPort;
}

/**
 * Enterprise Knowledge Capability — Employee Capability Framework implementation.
 * Uses a replaceable {@link KnowledgeRetrievalPort} (Enterprise Knowledge Platform in M6+).
 */
export class KnowledgeCapability implements EmployeeCapability {
  readonly id = 'ess.knowledge';
  readonly name = 'Knowledge';
  readonly version = '1.0.0';
  readonly description =
    'Enterprise knowledge intelligence — policies, guides, and FAQs with source attribution.';
  readonly supportedIntents = [
    'employee.knowledge.ask',
    'employee.knowledge.search',
    'employee.knowledge.related',
    'employee.knowledge.popular',
    'employee.knowledge.help',
    'employee.knowledge.categories',
  ] as const;
  readonly supportedEntities = KNOWLEDGE_ENTITIES;
  readonly supportedTools = ['knowledge.search', 'knowledge.related', 'knowledge.popular'] as const;
  readonly requiredPermissions = ['knowledge.search'];
  readonly priority = 80;
  readonly enabled = true;

  private readonly retrieval: KnowledgeRetrievalPort;

  constructor(options: KnowledgeCapabilityOptions = {}) {
    this.retrieval = options.retrieval ?? createStubKnowledgeStore();
  }

  getRetrieval(): KnowledgeRetrievalPort {
    return this.retrieval;
  }

  canHandle(input: CapabilityHandleInput): boolean {
    if (input.intent?.startsWith('employee.knowledge')) return true;
    if (input.intent === 'knowledge.search' || input.intent === 'general.assist') {
      return isKnowledgeRelatedMessage(input.message);
    }
    if (
      input.priorSlots &&
      (input.priorSlots['lastTopic'] ||
        input.priorSlots['lastDocumentIds'] ||
        input.priorSlots['query'])
    ) {
      return true;
    }
    return isKnowledgeRelatedMessage(input.message);
  }

  detectIntent(message: string, priorSlots?: SlotBag): string | undefined {
    return detectKnowledgeIntent(message, asKnowledgeSlots(priorSlots ?? {}));
  }

  extractEntities(input: CapabilityTurnInput): SlotBag {
    const prior = asKnowledgeSlots(input.priorSlots ?? {});
    const extracted = extractKnowledgeEntities(input.message, prior, input.now ?? new Date());
    return toSlotBag(mergeKnowledgeSlots(prior, extracted));
  }

  validate(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ValidationResult {
    const permissions = input.context?.permissions ?? [];
    if (permissions.length > 0 && !permissions.includes('knowledge.search')) {
      return {
        ok: false,
        issues: [
          {
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to search knowledge.',
            severity: 'error',
          },
        ],
      };
    }
    return { ok: true, issues: [] };
  }

  clarify(input: {
    readonly intent: string;
    readonly missing: readonly string[];
    readonly slots: SlotBag;
  }): ClarificationResult {
    const slots = asKnowledgeSlots(input.slots);
    if (input.missing.includes('country')) {
      return {
        question: 'Which country’s policy should I look up?',
        missing: input.missing,
        slots: input.slots,
        suggestedReplies: ['India', 'US', 'UK'],
      };
    }
    if (input.missing.includes('benefit')) {
      return {
        question: 'Which benefits — health, travel, insurance, or learning?',
        missing: input.missing,
        slots: input.slots,
        suggestedReplies: ['Health', 'Travel', 'Insurance', 'Learning'],
      };
    }
    return {
      question: 'Could you share a bit more detail about what you need?',
      missing: input.missing,
      slots: toSlotBag(slots),
      suggestedReplies: [
        'What is our leave policy?',
        'Can I work from home?',
        'How does reimbursement work?',
      ],
    };
  }

  buildExecutionPlan(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ExecutionPlan | null {
    const slots = asKnowledgeSlots(input.slots);
    const intent = input.intent as KnowledgeIntent;
    const toolName =
      intent === 'employee.knowledge.popular'
        ? 'knowledge.popular'
        : intent === 'employee.knowledge.related'
          ? 'knowledge.related'
          : 'knowledge.search';

    return {
      intent,
      toolName,
      arguments: {
        query: slots.query ?? input.message,
        ...(slots.domain ? { domain: slots.domain } : {}),
        ...(slots.category ? { category: slots.category } : {}),
        ...(slots.country ? { country: slots.country } : {}),
        ...(slots.lastDocumentIds ? { documentIds: slots.lastDocumentIds } : {}),
      },
      requiresConfirmation: false,
      slots: toSlotBag(slots),
      risk: 'low',
    };
  }

  buildConfirmation(): ConfirmationDraft | null {
    return null;
  }

  async execute(input: CapabilityExecuteInput): Promise<CapabilityExecuteResult> {
    const slots = asKnowledgeSlots(input.plan.slots);
    const message =
      typeof input.plan.arguments.query === 'string'
        ? input.plan.arguments.query
        : (slots.query ?? '');

    if (input.plan.toolName === 'knowledge.popular') {
      const popular = listMostViewed(8);
      return {
        kind: 'completed',
        data: {
          popular,
          text: `Popular questions:\n${popular.map((q) => `• ${q.question}`).join('\n')}`,
        },
      };
    }

    const outcome = await this.answerMessage({
      message,
      priorSlots: slots,
      permissions: input.context.permissions,
    });

    if (outcome.kind === 'answered') {
      return { kind: 'completed', data: outcome.answer };
    }
    if (outcome.kind === 'clarify') {
      return { kind: 'failed', message: outcome.question };
    }
    if (outcome.kind === 'invalid') {
      return { kind: 'failed', message: outcome.message };
    }
    return { kind: 'failed', message: outcome.message };
  }

  formatResponse(input: {
    readonly intent?: string;
    readonly toolName?: string;
    readonly toolResult?: unknown;
    readonly message?: string;
    readonly suggestedReplies?: readonly string[];
  }): CapabilityResponse {
    if (input.message) {
      return textResponse(input.message, {
        ...(input.suggestedReplies ? { suggestedReplies: input.suggestedReplies } : {}),
      });
    }
    if (input.toolResult && typeof input.toolResult === 'object') {
      const answer = input.toolResult as KnowledgeAnswer & { text?: string; popular?: unknown };
      if (typeof answer.text === 'string') {
        return textResponse(answer.text, {
          ...(input.suggestedReplies ? { suggestedReplies: input.suggestedReplies } : {}),
          ...(Array.isArray(answer.suggestedFollowUps)
            ? { suggestedReplies: answer.suggestedFollowUps }
            : {}),
        });
      }
    }
    return textResponse('Done.');
  }

  dashboardWidgets(): readonly DashboardWidgetDef[] {
    return [
      {
        id: 'knowledge.popular_policies',
        title: 'Popular Policies',
        description: 'Most viewed policy topics',
        route: '/app/employee/knowledge',
        order: 60,
        requiredPermissions: ['knowledge.search'],
      },
      {
        id: 'knowledge.recent_searches',
        title: 'Recent Searches',
        description: 'Your recent knowledge questions (session)',
        route: '/app/employee/knowledge',
        order: 61,
        requiredPermissions: ['knowledge.search'],
      },
      {
        id: 'knowledge.announcements',
        title: 'Company Announcements',
        description: 'Stub announcements feed',
        route: '/app/employee/knowledge',
        order: 62,
        requiredPermissions: ['knowledge.search'],
      },
      {
        id: 'knowledge.quick_links',
        title: 'Quick Links',
        description: 'Handbook, policies, FAQs',
        route: '/app/employee/knowledge',
        order: 63,
        requiredPermissions: ['knowledge.search'],
      },
      {
        id: 'knowledge.categories',
        title: 'Knowledge Categories',
        description: 'Browse HR, IT, Finance, and more',
        route: '/app/employee/knowledge',
        order: 64,
        requiredPermissions: ['knowledge.search'],
      },
      {
        id: 'knowledge.faqs',
        title: 'Frequently Asked Questions',
        description: 'Trending employee questions',
        route: '/app/employee/knowledge',
        order: 65,
        requiredPermissions: ['knowledge.search'],
      },
    ];
  }

  suggestedPrompts(): readonly SuggestedPromptDef[] {
    return [
      {
        id: 'knowledge.leave_policy',
        label: 'Leave policy',
        prompt: 'What is our leave policy?',
        kind: 'starter',
      },
      {
        id: 'knowledge.wfh',
        label: 'Work from home',
        prompt: 'Can I work from home?',
        kind: 'starter',
      },
      {
        id: 'knowledge.reimburse',
        label: 'Reimbursement',
        prompt: 'How does reimbursement work?',
        kind: 'follow_up',
      },
      {
        id: 'knowledge.conduct',
        label: 'Code of conduct',
        prompt: 'Where can I find the code of conduct?',
        kind: 'dashboard',
      },
      {
        id: 'knowledge.help',
        label: 'Knowledge help',
        prompt: 'What knowledge topics can you help with?',
        kind: 'quick_action',
      },
    ];
  }

  helpExamples(): CapabilityHelp {
    return {
      description: this.description,
      examples: [
        'What is our leave policy?',
        'Can I work from home?',
        'How many maternity leaves do I get?',
        'I forgot how reimbursement works.',
        'What is the leave policy, who approves it, and where is it documented?',
      ],
      supportedActions: [
        'Ask policy questions',
        'Multi-question prompts',
        'Follow-up questions',
        'Browse categories',
        'Popular / trending questions',
      ],
      limitations: [
        'Not production RAG — uses a replaceable retrieval abstraction (stub store today).',
        'Does not invent sources; says when no document is found.',
        'Does not approve leave or call HRIS vendors.',
      ],
      requiredPermissions: [...this.requiredPermissions],
    };
  }

  telemetry(): CapabilityTelemetryDescriptor {
    return { capabilityId: this.id, metricsPrefix: 'ess.knowledge' };
  }

  /**
   * Orchestrator entrypoint — answers via retrieval without MCP coupling.
   */
  async process(input: KnowledgeCapabilityInput): Promise<KnowledgeCapabilityOutcome> {
    return this.answerMessage(input);
  }

  async answerMessage(input: KnowledgeCapabilityInput): Promise<KnowledgeCapabilityOutcome> {
    const prior = input.priorSlots ?? {};
    const intent =
      detectKnowledgeIntent(input.message, prior) ?? ('employee.knowledge.ask' as KnowledgeIntent);

    if (
      !detectKnowledgeIntent(input.message, prior) &&
      !isKnowledgeRelatedMessage(input.message) &&
      !prior.lastTopic &&
      !prior.query
    ) {
      return {
        kind: 'unsupported',
        message:
          'I can help with company policies, benefits, IT guides, and related knowledge questions.',
      };
    }

    if (input.permissions && !input.permissions.includes('knowledge.search')) {
      return {
        kind: 'invalid',
        intent,
        message: 'You do not have permission to search knowledge.',
        slots: prior,
        suggestedReplies: [],
      };
    }

    const slots = mergeKnowledgeSlots(
      prior,
      extractKnowledgeEntities(input.message, prior, input.now ?? new Date()),
    );

    const requests = buildKnowledgeRequests(input.message, slots, intent);
    const clarify = needsKnowledgeClarification({
      intent,
      requests,
      slots,
      message: input.message,
    });
    if (clarify) {
      return {
        kind: 'clarify',
        intent,
        question: clarify.question,
        missing: clarify.missing,
        slots,
        ...(clarify.suggestedReplies ? { suggestedReplies: clarify.suggestedReplies } : {}),
        requests,
      };
    }

    if (intent === 'employee.knowledge.help') {
      const answer = this.buildHelpAnswer();
      return {
        kind: 'answered',
        intent,
        answer,
        slots: { ...slots, lastTopic: 'help', lastDomain: 'general', lastCategory: 'help' },
        requests,
      };
    }

    if (intent === 'employee.knowledge.categories') {
      const answer = this.buildCategoriesAnswer();
      return {
        kind: 'answered',
        intent,
        answer,
        slots: {
          ...slots,
          lastTopic: 'categories',
          lastDomain: 'general',
          lastCategory: 'help',
        },
        requests,
      };
    }

    if (intent === 'employee.knowledge.popular') {
      const answer = this.buildPopularAnswer();
      return {
        kind: 'answered',
        intent,
        answer,
        slots: {
          ...slots,
          lastTopic: 'popular',
          lastDomain: 'general',
          lastCategory: 'help',
        },
        requests,
      };
    }

    const hitsByRequest = new Map<string, readonly KnowledgeSearchHit[]>();
    for (const request of requests) {
      const result = await this.retrieval.search({
        text: request.text,
        ...(request.classification.domain ? { domain: request.classification.domain } : {}),
        ...(request.classification.category ? { category: request.classification.category } : {}),
        ...(request.classification.topic ? { topics: [request.classification.topic] } : {}),
        ...(slots.country ? { country: slots.country } : {}),
        limit: 5,
      });

      // Follow-up: boost related docs from prior context when classification is weak
      let hits = result.hits;
      if (hits.length === 0 && slots.lastDocumentIds?.length) {
        const related: KnowledgeSearchHit[] = [];
        for (const id of slots.lastDocumentIds) {
          const relatedDocs = await this.retrieval.listRelated(id, 3);
          for (const doc of relatedDocs) {
            related.push({
              document: doc,
              score: 8,
              ...(doc.section ? { matchedSection: doc.section } : {}),
            });
          }
        }
        hits = related;
      }
      hitsByRequest.set(request.id, hits);
    }

    const primaryHits = hitsByRequest.get(requests[0]?.id ?? '') ?? [];
    const primaryDoc = primaryHits[0]?.document;
    const relatedDocs = primaryDoc ? await this.retrieval.listRelated(primaryDoc.id, 5) : [];

    const answer = buildKnowledgeAnswer({
      requests,
      hitsByRequest,
      relatedDocs,
    });

    const nextSlots: KnowledgeSlots = {
      ...slots,
      query: input.message,
    };
    if (primaryDoc) {
      (nextSlots as { lastDocumentIds: string[] }).lastDocumentIds = [
        primaryDoc.id,
        ...(primaryDoc.relatedIds ?? []),
      ].slice(0, 5);
      (nextSlots as { lastTopic: string }).lastTopic = primaryDoc.topics[0] ?? primaryDoc.title;
      (nextSlots as { lastDomain: KnowledgeSlots['lastDomain'] }).lastDomain =
        primaryDoc.domain as KnowledgeSlots['lastDomain'];
      (nextSlots as { lastCategory: KnowledgeSlots['lastCategory'] }).lastCategory =
        primaryDoc.category as KnowledgeSlots['lastCategory'];
    }
    if (requests[0]?.classification.domain) {
      (nextSlots as { domain: KnowledgeSlots['domain'] }).domain =
        requests[0].classification.domain;
    }
    if (requests[0]?.classification.category) {
      (nextSlots as { category: KnowledgeSlots['category'] }).category =
        requests[0].classification.category;
    }

    return {
      kind: 'answered',
      intent,
      answer,
      slots: nextSlots,
      requests,
    };
  }

  private buildHelpAnswer(): KnowledgeAnswer {
    const domains = [...new Set(KNOWLEDGE_TAXONOMY.map((n) => n.domain))];
    const text = [
      'I can answer enterprise knowledge questions across:',
      ...domains.map((d) => `• ${domainLabel(d)}`),
      '',
      'Tips: ask naturally — you do not need document names.',
      'You can ask multiple questions in one message.',
      'Follow-ups like “What about paternity?” keep prior context.',
      '',
      'Limitations: answers come from the Enterprise Knowledge Platform (hybrid search + ACL) with source attribution. If no source exists, I will say so. Citations are never invented.',
    ].join('\n');

    return {
      text,
      parts: [
        {
          requestId: 'req-1',
          format: 'bullets',
          title: 'Knowledge help',
          text,
          sources: [],
          confidence: 1,
          found: true,
          suggestedFollowUps: [
            'What is our leave policy?',
            'Show popular knowledge questions',
            'Browse knowledge categories',
          ],
        },
      ],
      sources: [],
      suggestedFollowUps: [
        'What is our leave policy?',
        'Show popular knowledge questions',
        'Browse knowledge categories',
      ],
      confidence: 1,
      multiIntent: false,
    };
  }

  private buildCategoriesAnswer(): KnowledgeAnswer {
    const lines = KNOWLEDGE_TAXONOMY.filter((n) => n.domain !== 'general').map(
      (n) => `• ${domainLabel(n.domain)} → ${n.label}: ${n.examples[0] ?? ''}`,
    );
    const text = `Knowledge categories:\n${lines.join('\n')}`;
    return {
      text,
      parts: [
        {
          requestId: 'req-1',
          format: 'bullets',
          title: 'Categories',
          text,
          sources: [],
          confidence: 1,
          found: true,
        },
      ],
      sources: [],
      suggestedFollowUps: listTrendingQuestions(3).map((q) => q.question),
      confidence: 1,
      multiIntent: false,
    };
  }

  private buildPopularAnswer(): KnowledgeAnswer {
    const trending = listTrendingQuestions(5);
    const viewed = listMostViewed(5);
    const recent = listRecentlyUpdatedQuestions(5);
    const text = [
      'Trending:',
      ...trending.map((q) => `• ${q.question}`),
      '',
      'Most viewed:',
      ...viewed.map((q) => `• ${q.question} (${q.views} views)`),
      '',
      'Recently updated:',
      ...recent.map((q) => `• ${q.question}`),
    ].join('\n');

    return {
      text,
      parts: [
        {
          requestId: 'req-1',
          format: 'bullets',
          title: 'Popular questions',
          text,
          sources: [],
          confidence: 1,
          found: true,
          suggestedFollowUps: trending.slice(0, 3).map((q) => q.question),
        },
      ],
      sources: [],
      faqs: POPULAR_QUESTIONS.map((q) => q.question).slice(0, 8),
      suggestedFollowUps: trending.slice(0, 3).map((q) => q.question),
      confidence: 1,
      multiIntent: false,
    };
  }
}

export function createKnowledgeCapability(
  options?: KnowledgeCapabilityOptions,
): KnowledgeCapability {
  return new KnowledgeCapability(options);
}

export function formatKnowledgeAssistantMessage(outcome: KnowledgeCapabilityOutcome): string {
  if (outcome.kind === 'clarify') return outcome.question;
  if (outcome.kind === 'invalid') return outcome.message;
  if (outcome.kind === 'unsupported') return outcome.message;
  return formatKnowledgeAnswerMessage(outcome.answer);
}
