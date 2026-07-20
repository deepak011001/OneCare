import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '@onecare/events';
import { DOMAIN_EVENTS } from '@onecare/events';
import {
  createKnowledgeCapability,
  createStubKnowledgeStore,
  listMostViewed,
  listRecentlyUpdatedQuestions,
  listTrendingQuestions,
  POPULAR_QUESTIONS,
  KNOWLEDGE_TAXONOMY,
  type KnowledgeRetrievalPort,
} from '@onecare/ess-knowledge';
import type { RequestContext } from '@onecare/shared';
import { AUDIT_ACTIONS, DomainError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';

@Injectable()
export class KnowledgeService {
  private readonly retrieval: KnowledgeRetrievalPort;
  private readonly capability;

  constructor(
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {
    this.retrieval = createStubKnowledgeStore();
    this.capability = createKnowledgeCapability({ retrieval: this.retrieval });
  }

  private assertPermission(context: RequestContext) {
    if (!context.permissions.includes('knowledge.search')) {
      throw new DomainError('FORBIDDEN', 'Missing permission: knowledge.search');
    }
  }

  async getDashboard(context: RequestContext) {
    this.assertPermission(context);
    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.KNOWLEDGE_VIEW,
      resource: 'knowledge.dashboard',
      resourceId: 'stub',
      result: 'success',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
      metadata: {},
    });

    const popularDocs = (await this.retrieval.listPopular?.(6)) ?? [];
    const categories = (await this.retrieval.listCategories?.()) ?? [];

    return {
      popularPolicies: popularDocs.map((d) => ({
        id: d.id,
        title: d.title,
        summary: d.summary,
        domain: d.domain,
        category: d.category,
        url: d.url,
      })),
      recentSearches: [
        'What is our leave policy?',
        'Can I work from home?',
        'How does reimbursement work?',
      ],
      announcements: [
        {
          id: 'ann-1',
          title: 'Handbook refresh (stub)',
          body: 'Employee handbook was updated this quarter.',
          publishedAt: '2026-03-10',
        },
      ],
      quickLinks: [
        { id: 'handbook', label: 'Employee Handbook', href: '/app/employee/knowledge' },
        {
          id: 'leave-policy',
          label: 'Leave Policy',
          href: '/app/ai?prompt=What%20is%20our%20leave%20policy%3F',
        },
        { id: 'faqs', label: 'FAQs', href: '/app/employee/knowledge' },
      ],
      categories: categories.map((c) => ({
        domain: c.domain,
        category: c.category,
        count: c.count,
      })),
      faqs: listTrendingQuestions(6).map((q) => q.question),
      taxonomy: KNOWLEDGE_TAXONOMY.filter((n) => n.domain !== 'general').map((n) => ({
        domain: n.domain,
        category: n.category,
        label: n.label,
        example: n.examples[0],
      })),
    };
  }

  async search(
    context: RequestContext,
    input: { readonly q: string; readonly domain?: string; readonly category?: string },
  ) {
    this.assertPermission(context);
    const started = Date.now();
    const result = await this.retrieval.search({
      text: input.q,
      ...(input.domain ? { domain: input.domain } : {}),
      ...(input.category ? { category: input.category } : {}),
      limit: 8,
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.KNOWLEDGE_SEARCHED,
      occurredAt: new Date(),
      tenantId: String(context.tenantId),
      correlationId: String(context.correlationId),
      payload: {
        query: input.q,
        hitCount: result.hits.length,
        engine: result.engine,
        tookMs: Date.now() - started,
      },
    });

    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.KNOWLEDGE_SEARCH,
      resource: 'knowledge.search',
      resourceId: result.engine,
      result: 'success',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
      metadata: { hitCount: result.hits.length },
    });

    return {
      engine: result.engine,
      tookMs: result.tookMs,
      hits: result.hits.map((h) => ({
        id: h.document.id,
        title: h.document.title,
        summary: h.document.summary,
        domain: h.document.domain,
        category: h.document.category,
        score: h.score,
        section: h.matchedSection ?? h.document.section,
        lastUpdated: h.document.lastUpdated,
        documentType: h.document.documentType,
        url: h.document.url,
      })),
    };
  }

  async ask(context: RequestContext, message: string) {
    this.assertPermission(context);
    const outcome = await this.capability.process({
      message,
      permissions: context.permissions,
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.KNOWLEDGE_ANSWERED,
      occurredAt: new Date(),
      tenantId: String(context.tenantId),
      correlationId: String(context.correlationId),
      payload: {
        kind: outcome.kind,
        ...(outcome.kind === 'answered'
          ? {
              sourceCount: outcome.answer.sources.length,
              confidence: outcome.answer.confidence,
            }
          : {}),
      },
    });

    return outcome;
  }

  async getDocument(context: RequestContext, id: string) {
    this.assertPermission(context);
    const doc = await this.retrieval.getById(id);
    if (!doc) {
      throw new DomainError('NOT_FOUND', 'Knowledge document not found');
    }
    const related = await this.retrieval.listRelated(id, 5);
    return { document: doc, related };
  }

  async getPopular(context: RequestContext) {
    this.assertPermission(context);
    return {
      trending: listTrendingQuestions(),
      mostViewed: listMostViewed(),
      recentlyUpdated: listRecentlyUpdatedQuestions(),
      all: POPULAR_QUESTIONS,
    };
  }

  async getCategories(context: RequestContext) {
    this.assertPermission(context);
    return {
      taxonomy: KNOWLEDGE_TAXONOMY,
      counts: (await this.retrieval.listCategories?.()) ?? [],
    };
  }

  async getHelp(context: RequestContext) {
    this.assertPermission(context);
    return this.capability.helpExamples();
  }
}
