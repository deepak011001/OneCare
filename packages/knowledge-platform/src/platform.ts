import { STUB_KNOWLEDGE_DOCUMENTS } from '@onecare/ess-knowledge';
import type { KnowledgeRetrievalPort } from '@onecare/ess-knowledge';
import { DefaultAclResolver } from './acl';
import { ConfigurableChunker } from './chunking';
import { registerDefaultConnectors, InMemoryConnectorRegistry } from './connectors';
import { InMemoryDocumentIndex } from './document-index';
import { HashEmbeddingProvider, InMemoryVectorStore } from './embeddings';
import { DefaultIngestionPipeline } from './ingestion';
import { HeuristicMetadataExtractor } from './metadata';
import { InMemoryKnowledgeMetrics } from './metrics';
import { DefaultNormalizer } from './normalization';
import type {
  CheckpointStorePort,
  ConnectorRegistryPort,
  DocumentIndexPort,
  EmbeddingProviderPort,
  HybridSearchPort,
  IngestionPipelinePort,
  KnowledgeMetricsPort,
  RerankerPort,
  SourceRegistryPort,
  VectorStorePort,
} from './ports';
import { InMemoryCheckpointStore, InMemorySourceRegistry } from './registries';
import { PlatformKnowledgeRetrieval } from './retrieval';
import { DefaultHybridSearch, HeuristicReranker } from './search';
import type { AclPrincipal, KnowledgeSourceConfig } from './types';

export interface EnterpriseKnowledgePlatform {
  readonly retrieval: KnowledgeRetrievalPort;
  readonly ingestion: IngestionPipelinePort;
  readonly sources: SourceRegistryPort;
  readonly connectors: ConnectorRegistryPort;
  readonly index: DocumentIndexPort;
  readonly vectors: VectorStorePort;
  readonly embeddings: EmbeddingProviderPort;
  readonly hybridSearch: HybridSearchPort;
  readonly reranker: RerankerPort;
  readonly metrics: KnowledgeMetricsPort;
  readonly checkpoints: CheckpointStorePort;
  readonly tenantId: string;
  ensureTenantCorpus(tenantId: string): Promise<void>;
}

export interface CreatePlatformOptions {
  readonly tenantId?: string;
  readonly principal?: AclPrincipal;
  readonly seedStubCorpus?: boolean;
  readonly embeddingDimensions?: number;
  readonly chunkMaxChars?: number;
  readonly chunkOverlapChars?: number;
}

/**
 * Composition root for the Enterprise Knowledge Platform.
 * Default adapters are in-memory / local-hash — replace via ports without changing callers.
 */
export async function createEnterpriseKnowledgePlatform(
  options: CreatePlatformOptions = {},
): Promise<EnterpriseKnowledgePlatform> {
  const tenantId = options.tenantId ?? 'default';
  const acl = new DefaultAclResolver();
  const connectors = new InMemoryConnectorRegistry();
  registerDefaultConnectors(connectors);

  const index = new InMemoryDocumentIndex();
  const embeddings = new HashEmbeddingProvider(options.embeddingDimensions ?? 64);
  const vectors = new InMemoryVectorStore(acl);
  const metrics = new InMemoryKnowledgeMetrics();
  const sources = new InMemorySourceRegistry();
  const checkpoints = new InMemoryCheckpointStore();
  const normalizer = new DefaultNormalizer();
  const metadata = new HeuristicMetadataExtractor();
  const chunker = new ConfigurableChunker({
    strategy: 'heading',
    maxChars: options.chunkMaxChars ?? 900,
    overlapChars: options.chunkOverlapChars ?? 120,
  });

  const ingestion = new DefaultIngestionPipeline(
    connectors,
    normalizer,
    metadata,
    acl,
    chunker,
    embeddings,
    vectors,
    index,
    checkpoints,
    metrics,
  );

  const reranker = new HeuristicReranker();
  const hybridSearch = new DefaultHybridSearch(index, vectors, embeddings, acl, reranker, metrics);

  const principal: AclPrincipal = options.principal ?? { tenantId };
  const retrieval = new PlatformKnowledgeRetrieval(
    tenantId,
    hybridSearch,
    index,
    metrics,
    principal,
  );

  async function seedTenant(targetTenantId: string): Promise<void> {
    const stats = await index.stats(targetTenantId);
    if (stats.documents > 0) return;
    const source: KnowledgeSourceConfig = {
      id: 'seed-local',
      tenantId: targetTenantId,
      name: 'Seed Corpus (local)',
      connectorType: 'markdown',
      enabled: true,
      options: {
        visibility: 'public',
        documents: STUB_KNOWLEDGE_DOCUMENTS.map((d) => ({
          externalId: d.id,
          title: d.title,
          body: d.body,
          ...(d.url ? { sourceUri: d.url } : {}),
          lastModified: d.lastUpdated ?? new Date().toISOString(),
          contentType: 'text/markdown',
          ...(d.section ? { sections: [{ heading: d.section, body: d.body }] } : {}),
        })),
      },
    };
    await sources.upsert(source);
    await ingestion.sync({
      tenantId: targetTenantId,
      source,
      mode: 'full',
      principal: { tenantId: targetTenantId },
    });
  }

  if (options.seedStubCorpus !== false) {
    await seedTenant(tenantId);
  }

  return {
    retrieval,
    ingestion,
    sources,
    connectors,
    index,
    vectors,
    embeddings,
    hybridSearch,
    reranker,
    metrics,
    checkpoints,
    tenantId,
    ensureTenantCorpus: seedTenant,
  };
}

/**
 * KnowledgeRetrievalPort that resolves tenant per call and lazily seeds corpus.
 * Safe for Nest request scope without redesigning Employee Capability.
 */
export function createTenantAwareKnowledgeRetrieval(
  platform: EnterpriseKnowledgePlatform,
  resolveTenantId: () => string,
): KnowledgeRetrievalPort {
  const build = (tenantId: string) =>
    new PlatformKnowledgeRetrieval(
      tenantId,
      platform.hybridSearch,
      platform.index,
      platform.metrics,
      { tenantId },
    );

  return {
    engineId: 'enterprise-knowledge-platform',
    async search(query) {
      const tenantId = query.tenantId ?? resolveTenantId();
      await platform.ensureTenantCorpus(tenantId);
      return build(tenantId).search({ ...query, tenantId });
    },
    async getById(documentId) {
      const tenantId = resolveTenantId();
      await platform.ensureTenantCorpus(tenantId);
      return build(tenantId).getById(documentId);
    },
    async listRelated(documentId, limit) {
      const tenantId = resolveTenantId();
      await platform.ensureTenantCorpus(tenantId);
      return build(tenantId).listRelated(documentId, limit);
    },
    async listPopular(limit) {
      const tenantId = resolveTenantId();
      await platform.ensureTenantCorpus(tenantId);
      return build(tenantId).listPopular(limit);
    },
    async listCategories() {
      const tenantId = resolveTenantId();
      await platform.ensureTenantCorpus(tenantId);
      return build(tenantId).listCategories!();
    },
  };
}
