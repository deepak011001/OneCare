import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  createKnowledgeAdminService,
  type KnowledgeAdminActor,
  type KnowledgeAdminService,
} from '@onecare/knowledge-admin';
import type { RequestContext } from '@onecare/shared';

@Injectable()
export class KnowledgeAdminApiService {
  private readonly admin: KnowledgeAdminService = createKnowledgeAdminService();

  private actor(ctx: RequestContext): KnowledgeAdminActor {
    return {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      roles: ctx.roles,
    };
  }

  private wrap<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Knowledge admin error';
      if (/not found/i.test(message)) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  dashboard(ctx: RequestContext) {
    return this.wrap(() => this.admin.dashboard(this.actor(ctx)));
  }

  listFolders(ctx: RequestContext) {
    return this.wrap(() => this.admin.listFolders(this.actor(ctx)));
  }

  createFolder(ctx: RequestContext, body: { name: string; parentId?: string | null }) {
    return this.wrap(() => this.admin.createFolder(this.actor(ctx), body));
  }

  renameFolder(ctx: RequestContext, folderId: string, name: string) {
    return this.wrap(() => this.admin.renameFolder(this.actor(ctx), folderId, name));
  }

  moveFolder(ctx: RequestContext, folderId: string, parentId: string | null) {
    return this.wrap(() => this.admin.moveFolder(this.actor(ctx), folderId, parentId));
  }

  archiveFolder(ctx: RequestContext, folderId: string) {
    return this.wrap(() => this.admin.archiveFolder(this.actor(ctx), folderId));
  }

  deleteFolder(ctx: RequestContext, folderId: string) {
    return this.wrap(() => this.admin.deleteFolder(this.actor(ctx), folderId));
  }

  listDocuments(ctx: RequestContext, filter?: { status?: string; folderId?: string; q?: string }) {
    return this.wrap(() =>
      this.admin.listDocuments(this.actor(ctx), {
        ...(filter?.status
          ? {
              status: filter.status as
                'draft' | 'review' | 'approved' | 'published' | 'archived' | 'expired',
            }
          : {}),
        ...(filter?.folderId !== undefined ? { folderId: filter.folderId } : {}),
        ...(filter?.q ? { q: filter.q } : {}),
      }),
    );
  }

  getDocument(ctx: RequestContext, documentId: string) {
    return this.wrap(() => this.admin.getDocument(this.actor(ctx), documentId));
  }

  createDocument(
    ctx: RequestContext,
    body: {
      title: string;
      body: string;
      description?: string;
      summary?: string;
      folderId?: string | null;
      categoryIds?: string[];
      tagIds?: string[];
    },
  ) {
    return this.wrap(() => this.admin.createDocument(this.actor(ctx), body));
  }

  updateDocument(
    ctx: RequestContext,
    documentId: string,
    body: {
      title?: string;
      description?: string;
      body?: string;
      summary?: string;
      folderId?: string | null;
      categoryIds?: string[];
      tagIds?: string[];
      changeNote?: string;
    },
  ) {
    return this.wrap(() => this.admin.updateDocument(this.actor(ctx), documentId, body));
  }

  publish(ctx: RequestContext, documentId: string) {
    return this.wrap(() => this.admin.publish(this.actor(ctx), documentId));
  }

  archiveDocument(ctx: RequestContext, documentId: string) {
    return this.wrap(() => this.admin.archiveDocument(this.actor(ctx), documentId));
  }

  restoreVersion(ctx: RequestContext, documentId: string, version: number) {
    return this.wrap(() => this.admin.restoreVersion(this.actor(ctx), documentId, version));
  }

  listCategories(ctx: RequestContext) {
    return this.wrap(() => this.admin.listCategories(this.actor(ctx)));
  }

  createCategory(ctx: RequestContext, body: { name: string; description?: string }) {
    return this.wrap(() => this.admin.createCategory(this.actor(ctx), body));
  }

  deleteCategory(ctx: RequestContext, categoryId: string) {
    return this.wrap(() => this.admin.deleteCategory(this.actor(ctx), categoryId));
  }

  listTags(ctx: RequestContext) {
    return this.wrap(() => this.admin.listTags(this.actor(ctx)));
  }

  createTag(ctx: RequestContext, body: { name: string; color?: string }) {
    return this.wrap(() => this.admin.createTag(this.actor(ctx), body));
  }

  deleteTag(ctx: RequestContext, tagId: string) {
    return this.wrap(() => this.admin.deleteTag(this.actor(ctx), tagId));
  }

  listCollections(ctx: RequestContext) {
    return this.wrap(() => this.admin.listCollections(this.actor(ctx)));
  }

  createCollection(
    ctx: RequestContext,
    body: { name: string; description?: string; documentIds?: string[] },
  ) {
    return this.wrap(() => this.admin.createCollection(this.actor(ctx), body));
  }

  updateCollection(
    ctx: RequestContext,
    collectionId: string,
    body: { name?: string; description?: string; documentIds?: string[] },
  ) {
    return this.wrap(() => this.admin.updateCollection(this.actor(ctx), collectionId, body));
  }

  listApprovals(ctx: RequestContext, status?: 'pending' | 'approved' | 'rejected') {
    return this.wrap(() => this.admin.listApprovals(this.actor(ctx), status));
  }

  requestApproval(
    ctx: RequestContext,
    documentId: string,
    body?: { assignedTo?: string; note?: string },
  ) {
    return this.wrap(() => this.admin.requestApproval(this.actor(ctx), documentId, body));
  }

  decideApproval(
    ctx: RequestContext,
    approvalId: string,
    body: { decision: 'approved' | 'rejected'; note?: string },
  ) {
    return this.wrap(() =>
      this.admin.decideApproval(this.actor(ctx), approvalId, body.decision, body.note),
    );
  }

  playground(ctx: RequestContext, body: { question: string; scope?: 'draft' | 'published' }) {
    return this.wrap(() =>
      this.admin.playground(this.actor(ctx), body.question, body.scope ?? 'draft'),
    );
  }

  analytics(ctx: RequestContext) {
    return this.wrap(() => this.admin.analytics(this.actor(ctx)));
  }

  health(ctx: RequestContext) {
    return this.wrap(() => this.admin.health(this.actor(ctx)));
  }

  duplicates(ctx: RequestContext) {
    return this.wrap(() => this.admin.duplicates(this.actor(ctx)));
  }

  getSettings(ctx: RequestContext) {
    return this.wrap(() => this.admin.getSettings(this.actor(ctx)));
  }

  updateSettings(
    ctx: RequestContext,
    body: Partial<{
      maxUploadBytes: number;
      requireApproval: boolean;
      defaultVisibility: 'public' | 'private' | 'restricted';
      autoExpireDays: number;
    }>,
  ) {
    return this.wrap(() => this.admin.updateSettings(this.actor(ctx), body));
  }
}
