import type { HybridSearchHit, HybridSearchResult, AclPrincipal, Citation } from './types';
import type {
  AclResolverPort,
  DocumentIndexPort,
  EmbeddingProviderPort,
  HybridSearchPort,
  KnowledgeMetricsPort,
  RerankerPort,
  VectorStorePort,
} from './ports';

export class DefaultHybridSearch implements HybridSearchPort {
  constructor(
    private readonly index: DocumentIndexPort,
    private readonly vectors: VectorStorePort,
    private readonly embeddings: EmbeddingProviderPort,
    private readonly acl: AclResolverPort,
    private readonly reranker: RerankerPort,
    private readonly metrics: KnowledgeMetricsPort,
  ) {}

  async search(input: {
    readonly tenantId: string;
    readonly text: string;
    readonly principal: AclPrincipal;
    readonly limit?: number;
    readonly domain?: string;
    readonly category?: string;
  }): Promise<HybridSearchResult> {
    const started = Date.now();
    const limit = input.limit ?? 8;
    const q = input.text.toLowerCase();
    const tokens = q.split(/\W+/).filter((t) => t.length > 1);

    const docs = await this.index.list(input.tenantId);
    let keywordHits = 0;
    let metadataHits = 0;
    const scored = new Map<string, HybridSearchHit>();

    for (const row of docs) {
      if (!this.acl.isAllowed(row.document.acl, input.principal)) continue;
      if (input.domain && row.metadata.domain !== input.domain) continue;
      if (input.category && row.metadata.category !== input.category) continue;

      const full =
        `${row.document.title}\n${row.document.body}\n${row.metadata.topics.join(' ')}`.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      for (const token of tokens) {
        if (row.document.title.toLowerCase().includes(token)) {
          score += 4;
          reasons.push('title');
        }
        if (full.includes(token)) {
          score += 2;
          reasons.push('keyword');
          keywordHits += 1;
        }
      }

      if (row.metadata.keywords.some((k) => tokens.includes(k))) {
        score += 3;
        metadataHits += 1;
        reasons.push('metadata');
      }

      // Recency boost
      const ageDays =
        (Date.now() - Date.parse(row.document.lastModified || Date.now().toString())) /
        (1000 * 60 * 60 * 24);
      if (!Number.isNaN(ageDays) && ageDays < 90) {
        score += 1;
        reasons.push('recency');
      }

      // Popularity
      score += Math.min(3, row.popularity * 0.1);
      if (row.popularity > 0) reasons.push('popularity');

      if (score <= 0) continue;

      const chunk = (await this.index.get(input.tenantId, row.document.id))?.chunks[0];
      if (!chunk) continue;

      const citation: Citation = {
        documentId: row.document.id,
        title: row.document.title,
        ...(chunk.heading ? { section: chunk.heading } : {}),
        chunkId: chunk.id,
        sourceSystem: row.document.sourceSystem,
        lastUpdated: row.document.lastModified,
        confidence: Math.min(0.99, score / 20),
        ...(row.document.sourceUri ? { url: row.document.sourceUri } : {}),
      };

      scored.set(row.document.id, {
        chunk,
        document: row.document,
        score,
        citation,
        reasons: [...new Set(reasons)],
      });
    }

    // Vector branch
    const embedStarted = Date.now();
    const [queryEmbedding] = await this.embeddings.embed([input.text]);
    this.metrics.recordEmbeddingLatency(Date.now() - embedStarted);
    const vectorHits = queryEmbedding
      ? await this.vectors.search({
          tenantId: input.tenantId,
          embedding: queryEmbedding,
          limit: limit * 2,
          principal: input.principal,
        })
      : [];

    for (const vh of vectorHits) {
      const chunk = await this.index.getChunk(input.tenantId, vh.chunkId);
      if (!chunk) continue;
      const row = await this.index.get(input.tenantId, chunk.documentId);
      if (!row) continue;
      const existing = scored.get(row.document.id);
      const vectorScore = vh.score * 10;
      if (existing) {
        scored.set(row.document.id, {
          ...existing,
          score: existing.score + vectorScore,
          reasons: [...new Set([...existing.reasons, 'vector'])],
        });
      } else {
        scored.set(row.document.id, {
          chunk,
          document: row.document,
          score: vectorScore,
          citation: {
            documentId: row.document.id,
            title: row.document.title,
            ...(chunk.heading ? { section: chunk.heading } : {}),
            chunkId: chunk.id,
            sourceSystem: row.document.sourceSystem,
            lastUpdated: row.document.lastModified,
            confidence: Math.min(0.99, vh.score),
            ...(row.document.sourceUri ? { url: row.document.sourceUri } : {}),
          },
          reasons: ['vector'],
        });
      }
    }

    const afterAcl = scored.size;
    const rerankStarted = Date.now();
    const reranked = await this.reranker.rerank({
      query: input.text,
      hits: [...scored.values()],
      principal: input.principal,
    });
    this.metrics.recordRerankLatency(Date.now() - rerankStarted);

    const hits = reranked.slice(0, limit);
    const relatedDocumentIds = hits
      .flatMap((h) => {
        // related via shared topics
        return docs
          .filter(
            (d) =>
              d.document.id !== h.document.id &&
              d.metadata.topics.some((t) => h.chunk.metadata.topics.includes(t)),
          )
          .map((d) => d.document.id);
      })
      .slice(0, 10);

    const tookMs = Date.now() - started;
    this.metrics.recordSearchLatency(tookMs);
    if (hits.length) this.metrics.recordHit();
    else this.metrics.recordMiss();

    return {
      hits,
      relatedDocumentIds: [...new Set(relatedDocumentIds)],
      diagnostics: {
        keywordHits,
        vectorHits: vectorHits.length,
        metadataHits,
        afterAcl,
        afterRerank: hits.length,
        tookMs,
        engine: 'hybrid-v1',
      },
    };
  }
}

export class HeuristicReranker implements RerankerPort {
  readonly rerankerId = 'heuristic-v1';

  async rerank(input: {
    readonly query: string;
    readonly hits: readonly HybridSearchHit[];
    readonly principal: AclPrincipal;
  }): Promise<readonly HybridSearchHit[]> {
    const q = input.query.toLowerCase();
    return [...input.hits]
      .map((hit) => {
        let score = hit.score;
        // Authority: policies slightly preferred
        if (hit.document.documentType === 'policy') score += 1.5;
        if (hit.document.documentType === 'handbook') score += 1;
        // Department relevance
        if (
          input.principal.departmentId &&
          hit.document.acl.departmentIds?.includes(input.principal.departmentId)
        ) {
          score += 2;
        }
        // Quality: longer structured docs
        if (hit.document.sections.length > 1) score += 0.5;
        if (hit.document.title.toLowerCase().includes(q.split(/\s+/)[0] ?? '')) score += 1;
        return { ...hit, score };
      })
      .sort((a, b) => b.score - a.score);
  }
}
