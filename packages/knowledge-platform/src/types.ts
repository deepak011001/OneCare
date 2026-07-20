/**
 * Enterprise Knowledge Platform — shared domain models.
 * Provider-agnostic; no Azure/Pinecone/OpenAI/pgvector imports.
 */

export type KnowledgeSourceSystem =
  | 'sharepoint'
  | 'confluence'
  | 'google_drive'
  | 'onedrive'
  | 'notion'
  | 'local_files'
  | 'markdown'
  | 'html'
  | 'pdf'
  | 'docx'
  | 'csv'
  | 'wiki'
  | 'hrms_api'
  | 'stub';

export type DocumentLifecycleStatus =
  'active' | 'superseded' | 'soft_deleted' | 'draft' | 'archived';

export type AclVisibility = 'public' | 'private' | 'restricted';

export type ChunkingStrategy =
  'paragraph' | 'heading' | 'semantic' | 'sliding_window' | 'token' | 'table_aware';

export type SyncMode = 'full' | 'incremental' | 'manual' | 'scheduled' | 'webhook';

export type IngestionJobStatus =
  'queued' | 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled';

/** Mandatory ACL envelope — never return docs outside this scope. */
export interface DocumentAcl {
  readonly tenantId: string;
  readonly visibility: AclVisibility;
  readonly organizationIds?: readonly string[];
  readonly departmentIds?: readonly string[];
  readonly roles?: readonly string[];
  readonly securityGroups?: readonly string[];
  readonly entraGroupIds?: readonly string[];
  readonly ownerUserIds?: readonly string[];
}

export interface AclPrincipal {
  readonly tenantId: string;
  readonly userId?: string;
  readonly organizationId?: string;
  readonly departmentId?: string;
  readonly roles?: readonly string[];
  readonly securityGroups?: readonly string[];
  readonly entraGroupIds?: readonly string[];
}

export interface NormalizedSection {
  readonly id: string;
  readonly heading?: string;
  readonly body: string;
  readonly order: number;
}

export interface NormalizedDocument {
  readonly id: string;
  readonly sourceSystem: KnowledgeSourceSystem;
  readonly sourceUri?: string;
  readonly externalId: string;
  readonly title: string;
  readonly body: string;
  readonly sections: readonly NormalizedSection[];
  readonly headings: readonly string[];
  readonly tables: readonly string[];
  readonly lists: readonly string[];
  readonly links: readonly string[];
  readonly attachments: readonly string[];
  readonly language?: string;
  readonly owner?: string;
  readonly documentType: string;
  readonly lastModified: string;
  readonly fingerprint: string;
  readonly version: number;
  readonly status: DocumentLifecycleStatus;
  readonly acl: DocumentAcl;
  readonly rawContentType?: string;
}

export interface ExtractedMetadata {
  readonly keywords: readonly string[];
  readonly departments: readonly string[];
  readonly countries: readonly string[];
  readonly policies: readonly string[];
  readonly benefits: readonly string[];
  readonly leaveTypes: readonly string[];
  readonly applications: readonly string[];
  readonly projects: readonly string[];
  readonly products: readonly string[];
  readonly teams: readonly string[];
  readonly people: readonly string[];
  readonly locations: readonly string[];
  readonly customTags: readonly string[];
  readonly domain?: string;
  readonly category?: string;
  readonly topics: readonly string[];
}

export interface DocumentChunk {
  readonly id: string;
  readonly documentId: string;
  readonly version: number;
  readonly ordinal: number;
  readonly text: string;
  readonly heading?: string;
  readonly strategy: ChunkingStrategy;
  readonly tokenEstimate: number;
  readonly acl: DocumentAcl;
  readonly metadata: ExtractedMetadata;
  readonly sourceSystem: KnowledgeSourceSystem;
  readonly lastModified: string;
}

export interface EmbeddedChunk {
  readonly chunk: DocumentChunk;
  readonly embedding: readonly number[];
  readonly modelId: string;
  readonly dimensions: number;
}

export interface Citation {
  readonly documentId: string;
  readonly title: string;
  readonly section?: string;
  readonly chunkId?: string;
  readonly sourceSystem: KnowledgeSourceSystem;
  readonly lastUpdated?: string;
  readonly confidence: number;
  readonly url?: string;
}

export interface IndexedDocumentRecord {
  readonly document: NormalizedDocument;
  readonly metadata: ExtractedMetadata;
  readonly chunks: readonly DocumentChunk[];
  readonly popularity: number;
  readonly activeVersion: number;
}

export interface KnowledgeSourceConfig {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly connectorType: KnowledgeSourceSystem;
  readonly enabled: boolean;
  readonly scheduleCron?: string;
  readonly secretRef?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface ConnectorDocument {
  readonly externalId: string;
  readonly title: string;
  readonly body: string;
  readonly contentType?: string;
  readonly sourceUri?: string;
  readonly owner?: string;
  readonly lastModified: string;
  readonly deleted?: boolean;
  readonly versionHint?: number;
  readonly sections?: readonly { heading?: string; body: string }[];
}

export interface SyncCheckpoint {
  readonly sourceId: string;
  readonly tenantId: string;
  readonly cursor?: string;
  readonly lastSuccessAt?: string;
  readonly fingerprintIndex: Readonly<Record<string, string>>;
}

export interface IngestionJob {
  readonly id: string;
  readonly tenantId: string;
  readonly sourceId: string;
  readonly mode: SyncMode;
  readonly status: IngestionJobStatus;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly documentsProcessed: number;
  readonly chunksCreated: number;
  readonly errors: readonly string[];
  readonly checkpoint?: SyncCheckpoint;
}

export interface SearchDiagnostics {
  readonly keywordHits: number;
  readonly vectorHits: number;
  readonly metadataHits: number;
  readonly afterAcl: number;
  readonly afterRerank: number;
  readonly tookMs: number;
  readonly engine: string;
}

export interface HybridSearchHit {
  readonly chunk: DocumentChunk;
  readonly document: NormalizedDocument;
  readonly score: number;
  readonly citation: Citation;
  readonly reasons: readonly string[];
}

export interface HybridSearchResult {
  readonly hits: readonly HybridSearchHit[];
  readonly diagnostics: SearchDiagnostics;
  readonly relatedDocumentIds: readonly string[];
}

export interface IndexStatistics {
  readonly tenantId: string;
  readonly documents: number;
  readonly chunks: number;
  readonly sources: number;
  readonly softDeleted: number;
  readonly lastIndexedAt?: string;
}

export interface KnowledgePlatformMetricsSnapshot {
  readonly documentsIndexed: number;
  readonly chunksCreated: number;
  readonly embeddingLatencyMsTotal: number;
  readonly searchLatencyMsTotal: number;
  readonly rerankLatencyMsTotal: number;
  readonly hits: number;
  readonly misses: number;
  readonly connectorFailures: number;
  readonly syncDurationMsTotal: number;
}
