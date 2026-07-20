import type {
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeRetrievalPort,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
} from '@onecare/ess-knowledge';
import type { AclPrincipal, ExtractedMetadata, NormalizedDocument } from './types';
import type { DocumentIndexPort, HybridSearchPort, KnowledgeMetricsPort } from './ports';

const DOC_TYPES: readonly KnowledgeDocumentType[] = [
  'policy',
  'handbook',
  'sop',
  'faq',
  'announcement',
  'guide',
  'other',
];

function asDocumentType(value: string): KnowledgeDocumentType {
  return (
    DOC_TYPES.includes(value as KnowledgeDocumentType) ? value : 'other'
  ) as KnowledgeDocumentType;
}

/**
 * Production KnowledgeRetrievalPort backed by the Enterprise Knowledge Platform.
 * Employee Capability and Cross Orchestrator stay unchanged — only this adapter is swapped.
 */
export class PlatformKnowledgeRetrieval implements KnowledgeRetrievalPort {
  readonly engineId = 'enterprise-knowledge-platform';

  constructor(
    private readonly tenantId: string,
    private readonly hybridSearch: HybridSearchPort,
    private readonly index: DocumentIndexPort,
    private readonly _metrics: KnowledgeMetricsPort,
    private readonly defaultPrincipal?: AclPrincipal,
  ) {}

  private principal(queryTenant?: string): AclPrincipal {
    return (
      this.defaultPrincipal ?? {
        tenantId: queryTenant ?? this.tenantId,
      }
    );
  }

  async search(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult> {
    const tenantId = query.tenantId ?? this.tenantId;
    const result = await this.hybridSearch.search({
      tenantId,
      text: query.text,
      principal: this.principal(tenantId),
      limit: query.limit ?? 5,
      ...(query.domain ? { domain: query.domain } : {}),
      ...(query.category ? { category: query.category } : {}),
    });

    if (query.documentIds?.length) {
      const hits = [];
      for (const id of query.documentIds) {
        const row = await this.index.get(tenantId, id);
        if (!row) continue;
        hits.push({
          document: toKnowledgeDocument(row.document, row.metadata),
          score: 1,
          ...(row.document.sections[0]?.heading
            ? { matchedSection: row.document.sections[0].heading }
            : {}),
        });
      }
      return { hits, engine: this.engineId, tookMs: result.diagnostics.tookMs };
    }

    for (const hit of result.hits) {
      await this.index.touch?.(tenantId, hit.document.id);
    }

    return {
      engine: this.engineId,
      tookMs: result.diagnostics.tookMs,
      hits: result.hits.map((h) => ({
        document: toKnowledgeDocument(h.document, h.chunk.metadata),
        score: h.score,
        ...(h.citation.section ? { matchedSection: h.citation.section } : {}),
      })),
    };
  }

  async getById(documentId: string): Promise<KnowledgeDocument | null> {
    const row = await this.index.get(this.tenantId, documentId);
    if (!row) return null;
    return toKnowledgeDocument(row.document, row.metadata);
  }

  async listRelated(documentId: string, limit = 5): Promise<readonly KnowledgeDocument[]> {
    const row = await this.index.get(this.tenantId, documentId);
    if (!row) return [];
    const all = await this.index.list(this.tenantId);
    return all
      .filter((d) => d.document.id !== documentId)
      .filter((d) => d.metadata.topics.some((t) => row.metadata.topics.includes(t)))
      .slice(0, limit)
      .map((d) => toKnowledgeDocument(d.document, d.metadata));
  }

  async listPopular(limit = 8): Promise<readonly KnowledgeDocument[]> {
    const all = [...(await this.index.list(this.tenantId))];
    return all
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map((d) => toKnowledgeDocument(d.document, d.metadata));
  }

  async listCategories(): Promise<readonly { domain: string; category: string; count: number }[]> {
    const all = await this.index.list(this.tenantId);
    const map = new Map<string, number>();
    for (const row of all) {
      const domain = row.metadata.domain ?? 'general';
      const category = row.metadata.category ?? 'general';
      const key = `${domain}:${category}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, count]) => {
      const [domain, category] = key.split(':');
      return { domain: domain!, category: category!, count };
    });
  }
}

function toKnowledgeDocument(
  document: NormalizedDocument,
  metadata: ExtractedMetadata,
): KnowledgeDocument {
  return {
    id: document.id,
    title: document.title,
    body: document.body,
    summary: document.body.slice(0, 240).trim(),
    domain: metadata.domain ?? 'company',
    category: metadata.category ?? 'general',
    topics: metadata.topics,
    tags: metadata.customTags,
    documentType: asDocumentType(document.documentType),
    ...(document.sections[0]?.heading ? { section: document.sections[0].heading } : {}),
    lastUpdated: document.lastModified,
    ...(document.sourceUri ? { url: document.sourceUri } : {}),
    ...(metadata.countries[0] ? { country: metadata.countries[0] } : {}),
  };
}
