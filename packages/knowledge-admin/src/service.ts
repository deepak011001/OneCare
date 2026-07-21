import { getKnowledgeAdminStore, type InMemoryKnowledgeAdminStore } from './store';
import type {
  AdminKnowledgeDocument,
  ApprovalRequest,
  DocumentStatus,
  KnowledgeAdminActor,
  KnowledgeAdminSettings,
  KnowledgeAnalyticsSnapshot,
  KnowledgeCategory,
  KnowledgeCollection,
  KnowledgeFolder,
  KnowledgeHealthSnapshot,
  KnowledgeTag,
  PlaygroundResult,
} from './types';

/**
 * Application service for Knowledge Administration.
 * Controllers call this; adapters implement persistence later.
 */
export class KnowledgeAdminService {
  constructor(private readonly getStore: (tenantId: string) => InMemoryKnowledgeAdminStore) {}

  private store(actor: KnowledgeAdminActor): InMemoryKnowledgeAdminStore {
    const store = this.getStore(actor.tenantId);
    store.seedDefaults(actor);
    return store;
  }

  dashboard(actor: KnowledgeAdminActor): {
    analytics: KnowledgeAnalyticsSnapshot;
    health: KnowledgeHealthSnapshot;
  } {
    const s = this.store(actor);
    return { analytics: s.analytics(), health: s.health() };
  }

  listFolders(actor: KnowledgeAdminActor): readonly KnowledgeFolder[] {
    return this.store(actor).listFolders();
  }

  createFolder(
    actor: KnowledgeAdminActor,
    input: { name: string; parentId?: string | null },
  ): KnowledgeFolder {
    if (!input.name?.trim()) throw new Error('Folder name is required');
    return this.store(actor).createFolder(actor, {
      name: input.name,
      parentId: input.parentId ?? null,
    });
  }

  renameFolder(actor: KnowledgeAdminActor, folderId: string, name: string): KnowledgeFolder {
    if (!name?.trim()) throw new Error('Folder name is required');
    return this.store(actor).renameFolder(actor, folderId, name);
  }

  moveFolder(
    actor: KnowledgeAdminActor,
    folderId: string,
    parentId: string | null,
  ): KnowledgeFolder {
    return this.store(actor).moveFolder(actor, folderId, parentId);
  }

  archiveFolder(actor: KnowledgeAdminActor, folderId: string): KnowledgeFolder {
    return this.store(actor).archiveFolder(actor, folderId);
  }

  deleteFolder(actor: KnowledgeAdminActor, folderId: string): void {
    this.store(actor).deleteFolder(actor, folderId);
  }

  listDocuments(
    actor: KnowledgeAdminActor,
    filter?: { status?: DocumentStatus; folderId?: string | null; q?: string },
  ): readonly AdminKnowledgeDocument[] {
    return this.store(actor).listDocuments(filter);
  }

  getDocument(actor: KnowledgeAdminActor, documentId: string): AdminKnowledgeDocument {
    const doc = this.store(actor).getDocument(documentId);
    if (!doc) throw new Error('Document not found');
    return doc;
  }

  createDocument(
    actor: KnowledgeAdminActor,
    input: {
      title: string;
      body: string;
      description?: string;
      summary?: string;
      folderId?: string | null;
      categoryIds?: readonly string[];
      tagIds?: readonly string[];
      format?: AdminKnowledgeDocument['format'];
    },
  ): AdminKnowledgeDocument {
    if (!input.title?.trim() || !input.body?.trim()) {
      throw new Error('Title and body are required');
    }
    return this.store(actor).createDocument(actor, input);
  }

  updateDocument(
    actor: KnowledgeAdminActor,
    documentId: string,
    patch: Parameters<InMemoryKnowledgeAdminStore['updateDocument']>[2],
  ): AdminKnowledgeDocument {
    return this.store(actor).updateDocument(actor, documentId, patch);
  }

  publish(actor: KnowledgeAdminActor, documentId: string): AdminKnowledgeDocument {
    const s = this.store(actor);
    const doc = s.getDocument(documentId);
    if (!doc) throw new Error('Document not found');
    if (doc.status === 'draft' && s.getSettings().requireApproval) {
      throw new Error('Document requires approval before publish');
    }
    if (doc.status === 'draft') {
      s.transitionStatus(actor, documentId, 'review');
      s.transitionStatus(actor, documentId, 'approved');
    }
    if (doc.status === 'review') {
      s.transitionStatus(actor, documentId, 'approved');
    }
    return s.transitionStatus(actor, documentId, 'published');
  }

  archiveDocument(actor: KnowledgeAdminActor, documentId: string): AdminKnowledgeDocument {
    return this.store(actor).transitionStatus(actor, documentId, 'archived');
  }

  restoreVersion(
    actor: KnowledgeAdminActor,
    documentId: string,
    version: number,
  ): AdminKnowledgeDocument {
    return this.store(actor).restoreVersion(actor, documentId, version);
  }

  listCategories(actor: KnowledgeAdminActor): readonly KnowledgeCategory[] {
    return this.store(actor).listCategories();
  }

  createCategory(
    actor: KnowledgeAdminActor,
    input: { name: string; description?: string },
  ): KnowledgeCategory {
    if (!input.name?.trim()) throw new Error('Category name is required');
    return this.store(actor).createCategory(actor, input);
  }

  deleteCategory(actor: KnowledgeAdminActor, categoryId: string): void {
    this.store(actor).deleteCategory(actor, categoryId);
  }

  listTags(actor: KnowledgeAdminActor): readonly KnowledgeTag[] {
    return this.store(actor).listTags();
  }

  createTag(actor: KnowledgeAdminActor, input: { name: string; color?: string }): KnowledgeTag {
    if (!input.name?.trim()) throw new Error('Tag name is required');
    return this.store(actor).createTag(actor, {
      name: input.name,
      color: input.color ?? '#6b7c8a',
    });
  }

  deleteTag(actor: KnowledgeAdminActor, tagId: string): void {
    this.store(actor).deleteTag(actor, tagId);
  }

  listCollections(actor: KnowledgeAdminActor): readonly KnowledgeCollection[] {
    return this.store(actor).listCollections();
  }

  createCollection(
    actor: KnowledgeAdminActor,
    input: { name: string; description?: string; documentIds?: readonly string[] },
  ): KnowledgeCollection {
    if (!input.name?.trim()) throw new Error('Collection name is required');
    return this.store(actor).createCollection(actor, input);
  }

  updateCollection(
    actor: KnowledgeAdminActor,
    collectionId: string,
    patch: { name?: string; description?: string; documentIds?: readonly string[] },
  ): KnowledgeCollection {
    return this.store(actor).updateCollection(actor, collectionId, patch);
  }

  requestApproval(
    actor: KnowledgeAdminActor,
    documentId: string,
    input?: { assignedTo?: string; note?: string },
  ): ApprovalRequest {
    return this.store(actor).requestApproval(actor, documentId, input);
  }

  decideApproval(
    actor: KnowledgeAdminActor,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string,
  ): ApprovalRequest {
    return this.store(actor).decideApproval(actor, approvalId, decision, note);
  }

  listApprovals(
    actor: KnowledgeAdminActor,
    status?: ApprovalRequest['status'],
  ): readonly ApprovalRequest[] {
    return this.store(actor).listApprovals(status);
  }

  playground(
    actor: KnowledgeAdminActor,
    question: string,
    scope: 'draft' | 'published' = 'draft',
  ): PlaygroundResult {
    if (!question?.trim()) throw new Error('Question is required');
    return this.store(actor).playground(question.trim(), scope);
  }

  analytics(actor: KnowledgeAdminActor): KnowledgeAnalyticsSnapshot {
    return this.store(actor).analytics();
  }

  health(actor: KnowledgeAdminActor): KnowledgeHealthSnapshot {
    return this.store(actor).health();
  }

  duplicates(actor: KnowledgeAdminActor) {
    return this.store(actor).findDuplicates();
  }

  getSettings(actor: KnowledgeAdminActor): KnowledgeAdminSettings {
    return this.store(actor).getSettings();
  }

  updateSettings(
    actor: KnowledgeAdminActor,
    patch: Partial<KnowledgeAdminSettings>,
  ): KnowledgeAdminSettings {
    return this.store(actor).updateSettings(patch);
  }
}

export function createKnowledgeAdminService(): KnowledgeAdminService {
  return new KnowledgeAdminService(getKnowledgeAdminStore);
}
