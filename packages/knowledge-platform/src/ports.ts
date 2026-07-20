import type {
  AclPrincipal,
  ChunkingStrategy,
  ConnectorDocument,
  DocumentChunk,
  DocumentAcl,
  EmbeddedChunk,
  ExtractedMetadata,
  HybridSearchHit,
  HybridSearchResult,
  IndexStatistics,
  IngestionJob,
  KnowledgePlatformMetricsSnapshot,
  KnowledgeSourceConfig,
  KnowledgeSourceSystem,
  NormalizedDocument,
  SyncCheckpoint,
  SyncMode,
} from './types';

export interface KnowledgeConnectorPort {
  readonly type: KnowledgeSourceSystem;
  readonly displayName: string;
  listDocuments(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly checkpoint?: SyncCheckpoint;
    readonly mode: SyncMode;
  }): Promise<readonly ConnectorDocument[]>;
  health?(): Promise<'healthy' | 'degraded' | 'down' | 'stub'>;
}

export interface ConnectorRegistryPort {
  register(connector: KnowledgeConnectorPort): void;
  get(type: KnowledgeSourceSystem): KnowledgeConnectorPort | undefined;
  list(): readonly KnowledgeConnectorPort[];
}

export interface NormalizerPort {
  normalize(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly document: ConnectorDocument;
    readonly acl: DocumentAcl;
    readonly version: number;
  }): NormalizedDocument;
}

export interface MetadataExtractorPort {
  extract(document: NormalizedDocument): ExtractedMetadata;
}

export interface AclResolverPort {
  resolve(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly document: ConnectorDocument;
  }): DocumentAcl;
  isAllowed(acl: DocumentAcl, principal: AclPrincipal): boolean;
}

export interface ChunkerPort {
  readonly strategy: ChunkingStrategy;
  chunk(document: NormalizedDocument, metadata: ExtractedMetadata): readonly DocumentChunk[];
}

export interface EmbeddingProviderPort {
  readonly providerId: string;
  readonly modelId: string;
  readonly dimensions: number;
  embed(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface VectorStorePort {
  readonly storeId: string;
  upsert(chunks: readonly EmbeddedChunk[]): Promise<void>;
  deleteByDocumentId(tenantId: string, documentId: string): Promise<void>;
  search(input: {
    readonly tenantId: string;
    readonly embedding: readonly number[];
    readonly limit: number;
    readonly principal: AclPrincipal;
  }): Promise<readonly { chunkId: string; score: number }[]>;
}

export interface DocumentIndexPort {
  upsert(record: {
    readonly document: NormalizedDocument;
    readonly metadata: ExtractedMetadata;
    readonly chunks: readonly DocumentChunk[];
  }): Promise<void>;
  softDelete(tenantId: string, documentId: string): Promise<void>;
  get(
    tenantId: string,
    documentId: string,
  ): Promise<{
    document: NormalizedDocument;
    metadata: ExtractedMetadata;
    chunks: readonly DocumentChunk[];
    popularity: number;
  } | null>;
  list(tenantId: string): Promise<
    readonly {
      document: NormalizedDocument;
      metadata: ExtractedMetadata;
      popularity: number;
    }[]
  >;
  getChunk(tenantId: string, chunkId: string): Promise<DocumentChunk | null>;
  stats(tenantId: string): Promise<IndexStatistics>;
  /** Optional popularity / freshness touch for ranking. */
  touch?(tenantId: string, documentId: string): Promise<void>;
}

export interface HybridSearchPort {
  search(input: {
    readonly tenantId: string;
    readonly text: string;
    readonly principal: AclPrincipal;
    readonly limit?: number;
    readonly domain?: string;
    readonly category?: string;
  }): Promise<HybridSearchResult>;
}

export interface RerankerPort {
  readonly rerankerId: string;
  rerank(input: {
    readonly query: string;
    readonly hits: readonly HybridSearchHit[];
    readonly principal: AclPrincipal;
  }): Promise<readonly HybridSearchHit[]>;
}

export interface IngestionPipelinePort {
  sync(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly mode: SyncMode;
    readonly principal?: AclPrincipal;
  }): Promise<IngestionJob>;
  getJob(jobId: string): Promise<IngestionJob | null>;
  listJobs(tenantId: string): Promise<readonly IngestionJob[]>;
}

export interface KnowledgeMetricsPort {
  recordDocumentsIndexed(count: number): void;
  recordChunksCreated(count: number): void;
  recordEmbeddingLatency(ms: number): void;
  recordSearchLatency(ms: number): void;
  recordRerankLatency(ms: number): void;
  recordHit(): void;
  recordMiss(): void;
  recordConnectorFailure(): void;
  recordSyncDuration(ms: number): void;
  snapshot(): KnowledgePlatformMetricsSnapshot;
}

export interface SourceRegistryPort {
  upsert(source: KnowledgeSourceConfig): Promise<void>;
  get(tenantId: string, sourceId: string): Promise<KnowledgeSourceConfig | null>;
  list(tenantId: string): Promise<readonly KnowledgeSourceConfig[]>;
  remove(tenantId: string, sourceId: string): Promise<void>;
}

export interface CheckpointStorePort {
  get(tenantId: string, sourceId: string): Promise<SyncCheckpoint | null>;
  save(checkpoint: SyncCheckpoint): Promise<void>;
}
