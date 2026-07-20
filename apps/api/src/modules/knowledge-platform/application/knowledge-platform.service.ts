import { Inject, Injectable } from '@nestjs/common';
import type {
  EnterpriseKnowledgePlatform,
  KnowledgeSourceConfig,
  SyncMode,
} from '@onecare/knowledge-platform';
import type { RequestContext } from '@onecare/shared';
import { AUDIT_ACTIONS, DomainError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';

@Injectable()
export class KnowledgePlatformService {
  constructor(
    @Inject(APP_TOKENS.KNOWLEDGE_PLATFORM)
    private readonly platform: EnterpriseKnowledgePlatform | null,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  private requirePlatform(): EnterpriseKnowledgePlatform {
    if (!this.platform) {
      throw new DomainError('FAILED_PRECONDITION', 'Knowledge platform engine is disabled');
    }
    return this.platform;
  }

  private assertAdmin(context: RequestContext) {
    if (
      !context.permissions.includes('knowledge.admin') &&
      !context.permissions.includes('knowledge.upload')
    ) {
      throw new DomainError('FORBIDDEN', 'Missing permission: knowledge.admin');
    }
  }

  async listConnectors(context: RequestContext) {
    this.assertAdmin(context);
    const platform = this.requirePlatform();
    return platform.connectors.list().map((c) => ({
      type: c.type,
      displayName: c.displayName,
    }));
  }

  async listSources(context: RequestContext) {
    this.assertAdmin(context);
    const platform = this.requirePlatform();
    const tenantId = String(context.tenantId);
    return platform.sources.list(tenantId);
  }

  async upsertSource(context: RequestContext, source: KnowledgeSourceConfig) {
    this.assertAdmin(context);
    const platform = this.requirePlatform();
    if (source.tenantId !== String(context.tenantId)) {
      throw new DomainError('FORBIDDEN', 'Cross-tenant source upsert denied');
    }
    await platform.sources.upsert(source);
    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.KNOWLEDGE_ADMIN,
      resource: 'knowledge.source',
      resourceId: source.id,
      result: 'success',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
      metadata: { connectorType: source.connectorType },
    });
    return source;
  }

  async sync(
    context: RequestContext,
    input: { readonly sourceId: string; readonly mode?: SyncMode },
  ) {
    this.assertAdmin(context);
    const platform = this.requirePlatform();
    const tenantId = String(context.tenantId);
    const source = await platform.sources.get(tenantId, input.sourceId);
    if (!source) {
      throw new DomainError('NOT_FOUND', 'Knowledge source not found');
    }
    const job = await platform.ingestion.sync({
      tenantId,
      source,
      mode: input.mode ?? 'manual',
      principal: {
        tenantId,
        userId: String(context.userId),
        ...(context.organizationId ? { organizationId: String(context.organizationId) } : {}),
        ...(context.departmentId ? { departmentId: String(context.departmentId) } : {}),
        roles: context.roles,
      },
    });
    await this.audit.write({
      tenantId,
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.KNOWLEDGE_SYNC,
      resource: 'knowledge.sync',
      resourceId: job.id,
      result: job.status === 'failed' ? 'failure' : 'success',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
      metadata: { mode: job.mode, documentsProcessed: job.documentsProcessed },
    });
    return job;
  }

  async listJobs(context: RequestContext) {
    this.assertAdmin(context);
    return this.requirePlatform().ingestion.listJobs(String(context.tenantId));
  }

  async getJob(context: RequestContext, jobId: string) {
    this.assertAdmin(context);
    const job = await this.requirePlatform().ingestion.getJob(jobId);
    if (!job || job.tenantId !== String(context.tenantId)) {
      throw new DomainError('NOT_FOUND', 'Ingestion job not found');
    }
    return job;
  }

  async listDocuments(context: RequestContext) {
    this.assertAdmin(context);
    const rows = await this.requirePlatform().index.list(String(context.tenantId));
    return rows.map((r) => ({
      id: r.document.id,
      title: r.document.title,
      sourceSystem: r.document.sourceSystem,
      documentType: r.document.documentType,
      lastModified: r.document.lastModified,
      version: r.document.version,
      status: r.document.status,
      domain: r.metadata.domain,
      category: r.metadata.category,
      popularity: r.popularity,
    }));
  }

  async diagnostics(context: RequestContext, q: string) {
    this.assertAdmin(context);
    const platform = this.requirePlatform();
    const tenantId = String(context.tenantId);
    await platform.ensureTenantCorpus(tenantId);
    const result = await platform.hybridSearch.search({
      tenantId,
      text: q,
      principal: {
        tenantId,
        userId: String(context.userId),
        roles: context.roles,
      },
      limit: 10,
    });
    return {
      diagnostics: result.diagnostics,
      hits: result.hits.map((h) => ({
        documentId: h.document.id,
        title: h.document.title,
        score: h.score,
        citation: h.citation,
        reasons: h.reasons,
      })),
      // Never expose embeddings/vectors
    };
  }

  async indexHealth(context: RequestContext) {
    this.assertAdmin(context);
    const platform = this.requirePlatform();
    const tenantId = String(context.tenantId);
    const stats = await platform.index.stats(tenantId);
    return {
      stats,
      metrics: platform.metrics.snapshot(),
      connectors: platform.connectors.list().map((c) => ({
        type: c.type,
        displayName: c.displayName,
      })),
      embeddingProvider: platform.embeddings.providerId,
      vectorStore: platform.vectors.storeId,
    };
  }
}
