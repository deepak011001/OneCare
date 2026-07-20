/**
 * Knowledge retrieval port — swappable backends (stub today; Azure AI Search / vector DB later).
 * Capabilities must not import a concrete vector database.
 */

export type KnowledgeDocumentType =
  'policy' | 'handbook' | 'sop' | 'faq' | 'announcement' | 'guide' | 'other';

export interface KnowledgeDocument {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly summary: string;
  readonly domain: string;
  readonly category: string;
  readonly topics: readonly string[];
  readonly tags: readonly string[];
  readonly documentType: KnowledgeDocumentType;
  readonly section?: string;
  readonly lastUpdated?: string;
  readonly relatedIds?: readonly string[];
  readonly faqs?: readonly string[];
  readonly country?: string;
  readonly url?: string;
}

export interface KnowledgeSearchQuery {
  readonly tenantId?: string;
  readonly text: string;
  readonly domain?: string;
  readonly category?: string;
  readonly topics?: readonly string[];
  readonly tags?: readonly string[];
  readonly country?: string;
  readonly documentIds?: readonly string[];
  readonly limit?: number;
}

export interface KnowledgeSearchHit {
  readonly document: KnowledgeDocument;
  readonly score: number;
  readonly matchedSection?: string;
}

export interface KnowledgeSearchResult {
  readonly hits: readonly KnowledgeSearchHit[];
  readonly engine: string;
  readonly tookMs: number;
}

export interface KnowledgeRetrievalPort {
  readonly engineId: string;
  search(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult>;
  getById(documentId: string): Promise<KnowledgeDocument | null>;
  listRelated(documentId: string, limit?: number): Promise<readonly KnowledgeDocument[]>;
  listPopular?(limit?: number): Promise<readonly KnowledgeDocument[]>;
  listCategories?(): Promise<readonly { domain: string; category: string; count: number }[]>;
}

/** Future adapters implement this factory shape without changing the capability. */
export type KnowledgeRetrievalFactory = (options?: {
  readonly tenantId?: string;
}) => KnowledgeRetrievalPort;
