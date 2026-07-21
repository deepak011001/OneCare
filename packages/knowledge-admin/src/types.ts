/**
 * Knowledge Administration domain models — tenant-scoped CMS over the Knowledge Platform.
 * Does not own embeddings/vectors; publishing promotes content into ingestion.
 */

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived' | 'expired';

export type DocumentFormat =
  'markdown' | 'html' | 'richtext' | 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'txt' | 'image';

export type AclVisibility = 'public' | 'private' | 'restricted';

export type FolderStatus = 'active' | 'archived';

export interface KnowledgeAcl {
  readonly tenantId: string;
  readonly visibility: AclVisibility;
  readonly departmentIds?: readonly string[];
  readonly roles?: readonly string[];
  readonly ownerUserIds?: readonly string[];
}

export interface KnowledgeFolder {
  readonly id: string;
  readonly tenantId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
  readonly status: FolderStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
}

export interface KnowledgeCategory {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly parentId?: string | null;
  readonly createdAt: string;
}

export interface KnowledgeTag {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly color: string;
  readonly parentId?: string | null;
  readonly createdAt: string;
}

export interface KnowledgeCollection {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly documentIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DocumentVersion {
  readonly version: number;
  readonly title: string;
  readonly body: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly changeNote?: string;
  readonly fingerprint: string;
}

export interface AdminKnowledgeDocument {
  readonly id: string;
  readonly tenantId: string;
  readonly folderId: string | null;
  readonly title: string;
  readonly description: string;
  readonly body: string;
  readonly summary: string;
  readonly format: DocumentFormat;
  readonly language: string;
  readonly status: DocumentStatus;
  readonly version: number;
  readonly versions: readonly DocumentVersion[];
  readonly categoryIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly collectionIds: readonly string[];
  readonly department?: string;
  readonly ownerUserId: string;
  readonly acl: KnowledgeAcl;
  readonly source?: string;
  readonly connectorType?: string;
  readonly effectiveAt?: string;
  readonly expiresAt?: string;
  readonly chunkCount: number;
  readonly tokenEstimate: number;
  readonly fingerprint: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly publishedBy?: string;
  readonly publishedAt?: string;
}

export interface ApprovalRequest {
  readonly id: string;
  readonly tenantId: string;
  readonly documentId: string;
  readonly status: 'pending' | 'approved' | 'rejected';
  readonly step: 'author' | 'reviewer' | 'hr' | 'legal' | 'publish';
  readonly requestedBy: string;
  readonly assignedTo?: string;
  readonly note?: string;
  readonly createdAt: string;
  readonly decidedAt?: string;
}

export interface PlaygroundResult {
  readonly question: string;
  readonly scope: 'draft' | 'published';
  readonly answer: string;
  readonly confidence: number;
  readonly latencyMs: number;
  readonly citations: readonly {
    readonly documentId: string;
    readonly title: string;
    readonly version: number;
    readonly status: DocumentStatus;
  }[];
  readonly retrievedChunks: readonly {
    readonly documentId: string;
    readonly title: string;
    readonly excerpt: string;
    readonly score: number;
  }[];
  readonly diagnostics: {
    readonly query: string;
    readonly candidateCount: number;
    readonly rankedCount: number;
  };
}

export interface KnowledgeAnalyticsSnapshot {
  readonly tenantId: string;
  readonly documentsTotal: number;
  readonly byStatus: Readonly<Record<DocumentStatus, number>>;
  readonly categories: number;
  readonly tags: number;
  readonly collections: number;
  readonly folders: number;
  readonly pendingApprovals: number;
  readonly expiredDocs: number;
  readonly publishedDocs: number;
  readonly draftDocs: number;
  readonly avgTokenEstimate: number;
  readonly topCategories: readonly { id: string; name: string; count: number }[];
  readonly generatedAt: string;
}

export interface KnowledgeHealthSnapshot {
  readonly tenantId: string;
  readonly indexed: number;
  readonly pending: number;
  readonly processing: number;
  readonly errors: number;
  readonly expired: number;
  readonly missingOwner: number;
  readonly missingCategory: number;
  readonly duplicates: number;
  readonly generatedAt: string;
}

export interface KnowledgeAdminSettings {
  readonly tenantId: string;
  readonly maxUploadBytes: number;
  readonly allowedFormats: readonly DocumentFormat[];
  readonly requireApproval: boolean;
  readonly defaultVisibility: AclVisibility;
  readonly autoExpireDays?: number;
}

export interface KnowledgeAdminActor {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles?: readonly string[];
}
